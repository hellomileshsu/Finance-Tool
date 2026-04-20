import {useEffect, useState, KeyboardEvent} from 'react';

type Props = {
  value: number | undefined;
  onChange: (value: number) => void;
  isNegativeDanger?: boolean;
};

export function NumberInputCell({value, onChange, isNegativeDanger}: Props) {
  const [localValue, setLocalValue] = useState<string | number>(value ?? '');

  useEffect(() => {
    setLocalValue(value === 0 || value === undefined ? '' : value);
  }, [value]);

  const handleBlur = () => {
    const numVal = parseInt(localValue as string, 10);
    if (isNaN(numVal)) {
      onChange(0);
      setLocalValue('');
    } else {
      onChange(numVal);
      setLocalValue(numVal);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      type="number"
      className={`w-full bg-transparent text-right outline-none hover:bg-zinc-800/80 focus:bg-zinc-800 focus:ring-1 focus:ring-indigo-500 rounded px-1 py-1 transition-colors ${
        isNegativeDanger && (value ?? 0) < 0
          ? 'text-red-400 font-semibold'
          : 'text-zinc-300'
      }`}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="0"
    />
  );
}
