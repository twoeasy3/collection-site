import React, { useRef, useEffect } from 'react';

const FastInput = React.memo(({ value, onChange, style, placeholder }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.value = value || '';
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      style={style}
      defaultValue={value || ''}
      placeholder={placeholder}
      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
      onBlur={(e) => {
        if (e.target.value !== (value || '')) onChange(e.target.value);
      }}
      spellCheck="false"
      autoComplete="off"
      data-lpignore="true"
      data-1p-ignore="true"
      data-form-type="other"
    />
  );
});

export default FastInput;
