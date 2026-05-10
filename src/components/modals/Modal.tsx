import type { ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export const Modal = ({ title, onClose, children, footer }: Props) => (
  <>
    <div className="modal-shade" onClick={onClose}/>
    <div className="modal">
      <div className="modal-head">
        <span style={{ color: '#E8C760', fontSize: 14 }}>✦</span>
        <span className="title">{title}</span>
        <button className="close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-foot">{footer}</div>}
    </div>
  </>
);
