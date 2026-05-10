import { useEffect } from 'react';

interface Props {
  onClose: () => void;
}

export const DropInBanner = ({ onClose }: Props) => {
  useEffect(() => {
    const id = setTimeout(onClose, 4500);
    return () => clearTimeout(id);
  }, [onClose]);

  return (
    <div className="dropin-banner">
      <div className="nowyou">You arrive</div>
      <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: 14, lineHeight: 1.4 }}>
        You arrive at Thornwick Market, drawn by the rising smoke. Yanni and Bram turn at the
        sound of your boots, and Bram raises a hand in greeting.
      </div>
    </div>
  );
};
