export const nowIso = () => new Date().toISOString();

export const partitionDate = (value?: string | Date) => {
  const date = value ? new Date(value) : new Date();
  return date.toISOString().slice(0, 10);
};

