type RecordWithOptionalId = {
  id?: string | null;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function idPattern(prefix: string) {
  return new RegExp(`^${escapeRegExp(prefix)}-(\\d{6})$`);
}

export function isValidRecordId(id: string | null | undefined, prefix: string): id is string {
  return typeof id === "string" && idPattern(prefix).test(id);
}

export function getNextSequentialId(records: RecordWithOptionalId[], prefix: string) {
  const pattern = idPattern(prefix);
  const highestNumber = records.reduce((highest, record) => {
    const match = typeof record.id === "string" ? record.id.match(pattern) : null;
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return `${prefix}-${String(highestNumber + 1).padStart(6, "0")}`;
}

export function ensureRecordIds<T extends RecordWithOptionalId>(records: T[], prefix: string): Array<T & { id: string }> {
  const pattern = idPattern(prefix);
  const usedIds = new Set<string>();
  let nextNumber = records.reduce((highest, record) => {
    const match = typeof record.id === "string" ? record.id.match(pattern) : null;
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  function nextUniqueId() {
    let nextId = "";
    do {
      nextNumber += 1;
      nextId = `${prefix}-${String(nextNumber).padStart(6, "0")}`;
    } while (usedIds.has(nextId));
    usedIds.add(nextId);
    return nextId;
  }

  return records.map((record) => {
    const existingId = record.id;
    if (isValidRecordId(existingId, prefix) && !usedIds.has(existingId)) {
      usedIds.add(existingId);
      return record as T & { id: string };
    }

    return {
      ...record,
      id: nextUniqueId()
    };
  });
}
