export function exportToMondayCsv(client, period, objectives) {
  const headers = ['Group', 'Item', 'Status', 'AM Hours', 'SEO Hours', 'Total Hours']

  const rows = []

  objectives.forEach((obj) => {
    obj.tasks.forEach((task) => {
      const statusMap = {
        planned: 'Not Started',
        in_progress: 'Working on it',
        done: 'Done',
      }
      rows.push([
        obj.title,
        task.description,
        statusMap[task.status] || task.status,
        task.am_hours,
        task.seo_hours,
        task.am_hours + task.seo_hours,
      ])
    })
  })

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell)
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        })
        .join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${client.abbreviation}-${period.label.replace(' ', '-')}-tasks.csv`
  link.click()
  URL.revokeObjectURL(url)
}
