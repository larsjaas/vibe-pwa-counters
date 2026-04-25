import { defineConfig } from 'histoire'

export default defineConfig({
  storyMatch: ['src/**/*.story.@(ts|tsx|js|jsx)'],
  server: {
    host: '0.0.0.0',
  },
})
