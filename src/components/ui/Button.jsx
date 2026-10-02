// Button — renders a <button>, or a router <Link> when `to` is provided.
import { Link } from 'react-router-dom';
import Icon from './Icon';

export default function Button({
  variant = 'secondary',
  size,
  block = false,
  icon,
  iconRight,
  to,
  children,
  className = '',
  type = 'button',
  ...rest
}) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size && `btn-${size}`,
    block && 'btn-block',
    !children && icon && 'btn-icon',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const inner = (
    <>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 16 : 18} />}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} {...rest}>
      {inner}
    </button>
  );
}
