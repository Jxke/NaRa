import { Studio } from 'sanity'
import config from './sanity.config'

export default function SanityStudio() {
  return <Studio config={config} />
}
