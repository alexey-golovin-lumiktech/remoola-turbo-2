export const generateStrongPassword = (): string => {
  const lowerChars = `abcdefghijklmnopqrstuvwxyz`
  const upperChars = `ABCDEFGHIJKLMNOPQRSTUVWXYZ`
  const intChars = `0123456789`
  const specChars = `#?!@$%^&*`
  const password = []

  const getRandomValue = (source = ``) => source[Math.ceil(Math.random() * source.length)] ?? getRandomValue(source)

  for (let i = 0; i < 3; i++) {
    const randomValue = {
      upperKey: getRandomValue(upperChars),
      intKey: getRandomValue(intChars),
      specKey: getRandomValue(specChars),
      lowerKey: getRandomValue(lowerChars),
    }
    password.push(...Object.values(randomValue))
  }

  return encodeURIComponent(password.join(``))
}
