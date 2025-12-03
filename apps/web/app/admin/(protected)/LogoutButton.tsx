'use client'
export function LogoutButton() {
  async function go() {
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.href = '/admin/login'
  }
  return <button onClick={go} className="btn btn-ghost">Logout</button>
}
