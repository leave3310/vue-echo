class RefImpl {
    _value; // 保存實際數值
    constructor(value) {
        this._value = value //儲存傳入 ref 的數值
    }
}

export function ref(value) {
    return new RefImpl(value) // 建立一個 ref 實例
}