/* eslint-disable */
let wasm, u8array_ref, i32array_ref;

async function load() {
    if (wasm) return;

    {
        const { instance } = await WebAssembly.instantiateStreaming(fetch('https://deno.land/x/imagescript@1.1.14/utils/wasm/zlib.wasm'));
    
        wasm = instance.exports;
    }
    
    u8array_ref = new Uint8Array(wasm.memory.buffer);
    i32array_ref = new Int32Array(wasm.memory.buffer);
}

function u8array() {
    return u8array_ref.buffer === wasm.memory.buffer ? u8array_ref : (u8array_ref = new Uint8Array(wasm.memory.buffer));
}

function i32array() {
    return i32array_ref.buffer === wasm.memory.buffer ? i32array_ref : (i32array_ref = new Int32Array(wasm.memory.buffer));
}

function ptr_to_u8array(ptr, len) {
    return u8array().subarray(ptr, ptr + len);
}

function u8array_to_ptr(buffer) {
    const ptr = wasm.__wbindgen_malloc(buffer.length);
    u8array().set(buffer, ptr);
    return ptr;
}

export async function compress(buffer, level) {
    await load();

    const ptr = u8array_to_ptr(buffer);
    wasm.compress(8, ptr, buffer.length, level);

    const i32 = i32array();
    const slice = ptr_to_u8array(i32[2], i32[3]).slice();
    wasm.__wbindgen_free(i32[2], i32[3]);
    return slice;
}

export async function compress_raw(buffer, level) {
    await load();

    const ptr = u8array_to_ptr(buffer);
    wasm.compress_raw(8, ptr, buffer.length, level);

    const i32 = i32array();
    const slice = ptr_to_u8array(i32[2], i32[3]).slice();
    wasm.__wbindgen_free(i32[2], i32[3]);
    return slice;
}

export async function decompress(buffer, limit) {
    await load();

    const ptr = u8array_to_ptr(buffer);

    try {
        wasm.decompress(8, ptr, buffer.length, limit);

        const i32 = i32array();
        const slice = ptr_to_u8array(i32[2], i32[3]).slice();
        wasm.__wbindgen_free(i32[2], i32[3]);
        return slice;
    } catch {
        wasm.__wbindgen_free(ptr, buffer.length);
        throw new Error('zlib: panic');
    }
}

export async function decompress_raw(buffer, limit) {
    await load();

    const ptr = u8array_to_ptr(buffer);

    try {
        wasm.decompress_raw(8, ptr, buffer.length, limit);

        const i32 = i32array();
        const slice = ptr_to_u8array(i32[2], i32[3]).slice();
        wasm.__wbindgen_free(i32[2], i32[3]);
        return slice;
    } catch {
        wasm.__wbindgen_free(ptr, buffer.length);
        throw new Error('zlib: panic');
    }
}

export async function decompress_with(buffer, limit, transform) {
    await load();

    const ptr = u8array_to_ptr(buffer);

    try {
        wasm.decompress(8, ptr, buffer.length, limit);

        const i32 = i32array();
        const slice = ptr_to_u8array(i32[2], i32[3]);

        try {
            const value = transform(slice);
            wasm.__wbindgen_free(i32[2], i32[3]);
            return value;
        } catch (err) {
            wasm.__wbindgen_free(i32[2], i32[3]);
            throw err;
        }
    } catch {
        wasm.__wbindgen_free(ptr, buffer.length);
        throw new Error('zlib: panic');
    }
}

export async function decompress_raw_with(buffer, limit, transform) {
    await load();

    const ptr = u8array_to_ptr(buffer);

    try {
        wasm.decompress_raw(8, ptr, buffer.length, limit);

        const i32 = i32array();
        const slice = ptr_to_u8array(i32[2], i32[3]);

        try {
            const value = transform(slice);
            wasm.__wbindgen_free(i32[2], i32[3]);
            return value;
        } catch (err) {
            wasm.__wbindgen_free(i32[2], i32[3]);
            throw err;
        }
    } catch {
        wasm.__wbindgen_free(ptr, buffer.length);
        throw new Error('zlib: panic');
    }
}