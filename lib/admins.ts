// Server-only. Three fixed accounts, no database. Override the shared
// password via ADMIN_PASSWORD in your environment if you ever want to
// change it without editing code.

const ADMIN_USERNAMES = ["admin1", "admin2", "admin3"]
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "88888888"

export function isValidAdmin(username: string, password: string): boolean {
  return ADMIN_USERNAMES.includes(username) && password === ADMIN_PASSWORD
}
