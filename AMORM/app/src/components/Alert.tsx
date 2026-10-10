import React from 'react';

interface AlertProps {
  type: 'danger' | 'warning' | 'success';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({ type, title, children, className = '' }) => {
  return (
    <div className={`alert ${type} ${className}`}>
      {title && <strong>{title}</strong>}
      {children}
    </div>
  );
};
