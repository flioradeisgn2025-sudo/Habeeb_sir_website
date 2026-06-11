import { Link } from 'react-router-dom'

// Renders a plain <a> for external (http/https) or mailto/tel/wa.me links and a
// React-Router <Link> for internal paths, so admin-entered links always work.
const isExternal = (to) => /^(https?:|mailto:|tel:|wa\.me)/i.test(to || '')

export default function SmartLink({ to, children, ...rest }) {
  const target = to || ''
  if (isExternal(target)) {
    const href = /^wa\.me/i.test(target) ? `https://${target}` : target
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    )
  }
  return <Link to={target || '/'} {...rest}>{children}</Link>
}
