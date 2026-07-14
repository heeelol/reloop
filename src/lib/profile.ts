const NAME_KEY = 'reloop_name'
const ONBOARDED_KEY = 'reloop_onboarded'

const ADJ = ['Kind', 'Green', 'Local', 'Sunny', 'Cosy', 'Bright', 'Merry', 'Leafy']
const NOUN = ['Otter', 'Robin', 'Fox', 'Bee', 'Wren', 'Hare', 'Finch', 'Lark']

export function getName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || ''
  } catch {
    return ''
  }
}

export function setName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name.trim())
  } catch {
    /* ignore */
  }
}

export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === '1'
  } catch {
    return true
  }
}

export function setOnboarded() {
  try {
    localStorage.setItem(ONBOARDED_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function suggestName(): string {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)]
  const n = NOUN[Math.floor(Math.random() * NOUN.length)]
  return `${a} ${n}`
}
