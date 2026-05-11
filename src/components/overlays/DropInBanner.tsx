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
        You arrive at Ash Hollow as the smoke parts. The party forms up, the warg lowers its
        head, and the next few seconds are all steel, spellwork, and survival.
      </div>
    </div>
  );
};

