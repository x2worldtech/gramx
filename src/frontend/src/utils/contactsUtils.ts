export interface ContactEntry {
  principal: string;
  username: string;
  name: string;
  alias: string;
  addedAt: number;
}

const STORAGE_KEY = "gramx_contacts";

export function getContacts(): ContactEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveContacts(contacts: ContactEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

export function isContact(principal: string): boolean {
  return getContacts().some((c) => c.principal === principal);
}

export function addContact(entry: Omit<ContactEntry, "addedAt">): void {
  const contacts = getContacts().filter((c) => c.principal !== entry.principal);
  contacts.push({ ...entry, addedAt: Date.now() });
  saveContacts(contacts);
}

export function removeContact(principal: string): void {
  saveContacts(getContacts().filter((c) => c.principal !== principal));
}

export function updateAlias(principal: string, alias: string): void {
  const contacts = getContacts().map((c) =>
    c.principal === principal ? { ...c, alias } : c,
  );
  saveContacts(contacts);
}

export function getContactAlias(principal: string): string | null {
  const c = getContacts().find((c) => c.principal === principal);
  return c ? c.alias || null : null;
}
