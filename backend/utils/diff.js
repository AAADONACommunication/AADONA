const getDiff = (oldObj, newObj, fields) => {
  const changes = {};
  fields.forEach((field) => {
    const oldVal = oldObj[field];
    const newVal = newObj[field];
    if (newVal !== undefined && String(newVal) !== String(oldVal)) {
      changes[field] = { old: oldVal, new: newVal };
    }
  });
  return changes;
};

const getArrayDiff = (oldArr = [], newArr = []) => {
  const added = newArr.filter((x) => !oldArr.includes(x));
  const removed = oldArr.filter((x) => !newArr.includes(x));
  return { added, removed };
};

module.exports = { getDiff, getArrayDiff };
