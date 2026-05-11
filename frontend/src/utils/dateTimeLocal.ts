function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatDateTimeLocalInput(value: Date) {
  return [
    value.getFullYear(),
    pad(value.getMonth() + 1),
    pad(value.getDate())
  ].join("-") + `T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function addMinutesToDateTimeLocal(value: string, minutes: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return formatDateTimeLocalInput(new Date(date.getTime() + minutes * 60000));
}
