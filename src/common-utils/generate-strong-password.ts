export const generateStrongPassword = (): string => {
  const lowerChars = `abcdefghijklmnopqrstuvwxyz`
  const upperChars = `ABCDEFGHIJKLMNOPQRSTUVWXYZ`
  const intChars = `0123456789`
  const specChars = `#?!@$%^&*`
  const password: string[] = []

  const getRandomValue = (source: string): string => {
    return source[Math.floor(Math.random() * source.length)]
  }

  for (let i = 0; i < 3; i++) {
    password.push(getRandomValue(upperChars))
    password.push(getRandomValue(intChars))
    password.push(getRandomValue(specChars))
    password.push(getRandomValue(lowerChars))
  }

  return encodeURIComponent(password.join(``))
}
