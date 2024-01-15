exports.countInstances = (arr) => {
    // input    [1, 3, 1]
    // output    {'1': 2, '3': 1}
    const out = {};
    arr.forEach((item) => {
        if (out[item]) {
            out[item] += 1;
        } else {
            out[item] = 1;
        }
    });
    return out;
};
