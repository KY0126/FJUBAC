export type DepartmentStackLayout = {
  offset: number;
  scale: number;
  opacity: number;
  zIndex: number;
  shift: string;
};

export function getCircularOffset(index: number, activeIndex: number, count: number) {
  const half = Math.floor(count / 2);
  let offset = index - activeIndex;
  if (offset > half) offset -= count;
  if (offset < -half) offset += count;
  return offset;
}

export function getDepartmentStackLayout(index: number, activeIndex: number, count: number): DepartmentStackLayout {
  const offset = getCircularOffset(index, activeIndex, count);
  const distance = Math.abs(offset);
  return {
    offset,
    scale: 1 - distance * 0.13,
    opacity: 1 - distance * 0.22,
    zIndex: count - distance,
    shift: `${offset * 72}%`,
  };
}
