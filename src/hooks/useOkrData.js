import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { mockOkrData } from '../lib/mockData'

// ─── DB ↔ Frontend Conversion ─────────────────────────────────

function periodFromDb(row) {
  return {
    id: row.id,
    startMonth: row.start_month,
    startYear: row.start_year,
    endMonth: row.end_month,
    endYear: row.end_year,
    isPublished: row.is_published,
    goal: row.goal || '',
    seoRetainer: row.seo_retainer ?? null,
    offsiteAllowancePercent: Number(row.offsite_allowance_percent),
    adminTasks: {
      monthlyReportingAM: Number(row.admin_monthly_reporting_am),
      monthlyReportingSEO: Number(row.admin_monthly_reporting_seo),
      okrReportingAM: Number(row.admin_okr_reporting_am),
      okrReportingSEO: Number(row.admin_okr_reporting_seo),
    },
    objectives: [],
  }
}

function periodToDb(period, clientId) {
  return {
    id: period.id,
    client_id: clientId,
    start_month: period.startMonth,
    start_year: period.startYear,
    end_month: period.endMonth,
    end_year: period.endYear,
    is_published: period.isPublished,
    goal: period.goal,
    seo_retainer: period.seoRetainer ?? null,
    offsite_allowance_percent: period.offsiteAllowancePercent,
    admin_monthly_reporting_am: period.adminTasks.monthlyReportingAM,
    admin_monthly_reporting_seo: period.adminTasks.monthlyReportingSEO,
    admin_okr_reporting_am: period.adminTasks.okrReportingAM,
    admin_okr_reporting_seo: period.adminTasks.okrReportingSEO,
  }
}

function objectiveFromDb(row) {
  return {
    id: row.id,
    title: row.title,
    scope: row.scope,
    scopeDetail: row.scope_detail || '',
    isActioned: row.is_actioned ?? true,
    notActionedReason: row.not_actioned_reason || '',
    keyResults: [],
  }
}

function objectiveToDb(obj, periodId, sortOrder) {
  return {
    id: obj.id,
    period_id: periodId,
    title: obj.title,
    scope: obj.scope,
    scope_detail: obj.scopeDetail || '',
    is_actioned: obj.isActioned ?? true,
    not_actioned_reason: obj.notActionedReason || '',
    sort_order: sortOrder,
  }
}

function keyResultFromDb(row) {
  return {
    id: row.id,
    task: row.task,
    description: row.description || '',
    amHours: Number(row.am_hours),
    seoHours: Number(row.seo_hours),
  }
}

function keyResultToDb(kr, objectiveId, sortOrder) {
  return {
    id: kr.id,
    objective_id: objectiveId,
    task: kr.task,
    description: kr.description || '',
    am_hours: kr.amHours,
    seo_hours: kr.seoHours,
    sort_order: sortOrder,
  }
}

// ─── Hook ─────────────────────────────────────────────────────

export function useOkrData(clientId) {
  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    if (!supabase) {
      const mock = mockOkrData[clientId]
      setPeriods(mock?.periods || [])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data: periodRows, error: pErr } = await supabase
        .from('okr_periods')
        .select('*')
        .eq('client_id', clientId)
        .order('start_year', { ascending: false })
        .order('start_month', { ascending: false })

      if (pErr) throw pErr

      if (!periodRows?.length) {
        setPeriods([])
        setLoading(false)
        return
      }

      const periodIds = periodRows.map(p => p.id)

      const { data: objRows, error: oErr } = await supabase
        .from('okr_objectives')
        .select('*')
        .in('period_id', periodIds)
        .order('sort_order')

      if (oErr) throw oErr

      const objectiveIds = (objRows || []).map(o => o.id)

      let krRows = []
      if (objectiveIds.length > 0) {
        const { data, error: kErr } = await supabase
          .from('okr_key_results')
          .select('*')
          .in('objective_id', objectiveIds)
          .order('sort_order')

        if (kErr) throw kErr
        krRows = data || []
      }

      // Assemble nested structure
      const assembled = periodRows.map(pRow => {
        const period = periodFromDb(pRow)
        period.objectives = (objRows || [])
          .filter(o => o.period_id === pRow.id)
          .map(oRow => {
            const obj = objectiveFromDb(oRow)
            obj.keyResults = krRows
              .filter(kr => kr.objective_id === oRow.id)
              .map(keyResultFromDb)
            return obj
          })
        return period
      })

      setPeriods(assembled)
    } catch (err) {
      setError('Failed to load OKR data.')
      console.error('useOkrData fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Save a full period tree (upsert period + objectives + key results)
  const savePeriod = useCallback(async (period) => {
    if (!supabase) {
      setPeriods(prev => {
        const exists = prev.some(p => p.id === period.id)
        return exists
          ? prev.map(p => p.id === period.id ? period : p)
          : [...prev, period]
      })
      return
    }

    setSaving(true)
    try {
      // Upsert period
      const { error: pErr } = await supabase
        .from('okr_periods')
        .upsert(periodToDb(period, clientId))

      if (pErr) throw pErr

      // Diff objectives: find removed ones
      const { data: existingObjs } = await supabase
        .from('okr_objectives')
        .select('id')
        .eq('period_id', period.id)

      const existingObjIds = new Set((existingObjs || []).map(o => o.id))
      const newObjIds = new Set(period.objectives.map(o => o.id))

      const removedObjIds = [...existingObjIds].filter(id => !newObjIds.has(id))
      if (removedObjIds.length > 0) {
        await supabase.from('okr_objectives').delete().in('id', removedObjIds)
      }

      // Upsert objectives
      if (period.objectives.length > 0) {
        const objRows = period.objectives.map((o, i) =>
          objectiveToDb(o, period.id, i)
        )
        const { error: oErr } = await supabase
          .from('okr_objectives')
          .upsert(objRows)

        if (oErr) throw oErr
      }

      // Diff key results: find removed ones
      const allObjIds = period.objectives.map(o => o.id)
      let existingKrIds = new Set()
      if (allObjIds.length > 0) {
        const { data: existingKrs } = await supabase
          .from('okr_key_results')
          .select('id')
          .in('objective_id', allObjIds)

        existingKrIds = new Set((existingKrs || []).map(kr => kr.id))
      }

      const allNewKrs = period.objectives.flatMap(o => o.keyResults)
      const newKrIds = new Set(allNewKrs.map(kr => kr.id))

      const removedKrIds = [...existingKrIds].filter(id => !newKrIds.has(id))
      if (removedKrIds.length > 0) {
        await supabase.from('okr_key_results').delete().in('id', removedKrIds)
      }

      // Upsert key results
      if (allNewKrs.length > 0) {
        const krRows = period.objectives.flatMap((o) =>
          o.keyResults.map((kr, ki) =>
            keyResultToDb(kr, o.id, ki)
          )
        )
        const { error: kErr } = await supabase
          .from('okr_key_results')
          .upsert(krRows)

        if (kErr) throw kErr
      }

      // Update local state
      setPeriods(prev => {
        const exists = prev.some(p => p.id === period.id)
        return exists
          ? prev.map(p => p.id === period.id ? period : p)
          : [...prev, period]
      })
    } catch (err) {
      console.error('savePeriod error:', err)
      throw err
    } finally {
      setSaving(false)
    }
  }, [clientId])

  // Update just the is_published flag
  const setPublished = useCallback(async (periodId, isPublished) => {
    if (!supabase) {
      setPeriods(prev => prev.map(p =>
        p.id === periodId ? { ...p, isPublished } : p
      ))
      return
    }

    const { error: err } = await supabase
      .from('okr_periods')
      .update({ is_published: isPublished })
      .eq('id', periodId)

    if (err) throw err

    setPeriods(prev => prev.map(p =>
      p.id === periodId ? { ...p, isPublished } : p
    ))
  }, [])

  // Delete a period (cascade handles children)
  const removePeriod = useCallback(async (periodId) => {
    if (!supabase) {
      setPeriods(prev => prev.filter(p => p.id !== periodId))
      return
    }

    const { error: err } = await supabase
      .from('okr_periods')
      .delete()
      .eq('id', periodId)

    if (err) throw err

    setPeriods(prev => prev.filter(p => p.id !== periodId))
  }, [])

  return {
    periods,
    setPeriods,
    loading,
    error,
    saving,
    savePeriod,
    setPublished,
    removePeriod,
    refetch: fetchData,
  }
}

// Lightweight fetch for PlannerHome — latest period per client
export async function fetchLatestPeriods() {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('okr_periods')
    .select('client_id, is_published, start_month, start_year, end_month, end_year, goal')
    .order('start_year', { ascending: false })
    .order('start_month', { ascending: false })

  if (error) {
    console.error('fetchLatestPeriods error:', error)
    return null
  }

  // Group by client_id, take the first (most recent) for each
  const byClient = {}
  for (const row of data || []) {
    if (!byClient[row.client_id]) {
      byClient[row.client_id] = {
        isPublished: row.is_published,
        startMonth: row.start_month,
        startYear: row.start_year,
        endMonth: row.end_month,
        endYear: row.end_year,
        goal: row.goal || '',
      }
    }
  }
  return byClient
}
