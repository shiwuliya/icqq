function sub_a(a: Buffer, b: Buffer): void {
    const p = Buffer.from(b).slice(16).reverse();
    for (let i = 0; i < 16 && i < p.length; i++) {
        a[i] ^= p[i];
    }
}

function sub_b(a: Buffer, b: Buffer): void {
    const p = Buffer.from(b).slice(24);
    a[0] ^= p[3];
    a[1] ^= p[6];
    a[2] ^= p[9];
    a[3] ^= p[12];
    a[4] ^= p[7];
    a[5] ^= p[10];
    a[6] ^= p[13];
    a[7] ^= p[0];
    a[8] ^= p[11];
    a[9] ^= p[14];
    a[10] ^= p[1];
    a[11] ^= p[4];
    a[12] ^= p[15];
    a[13] ^= p[2];
    a[14] ^= p[5];
    a[15] ^= p[8];
}

function sub_c(a: Buffer, b: Buffer): void {
    let di = a;
    let si = Buffer.from(b).slice(8);
    let ax = si;
    let cx = si[0] & 15;
    cx = ((cx >> 4) << 4) + cx;
    ax = ax.slice(1);
    for (let i = 0; i < 15; i++) {
        cx = ((ax[i] & 15) + ((cx >> 4) << 4));
        cx = ((cx >> 4) << 4) + cx;
        di[i] = si[cx];
    }
    cx = ((ax[15] & 15) + ((cx >> 4) << 4));
    cx = ((cx >> 4) << 4) + cx;
    di[15] = si[cx];
}

function sub_d(t: Buffer, s: Buffer): Buffer {
    const buf = Buffer.alloc(32);
    buf.set(s.slice(8, 16), 0);
    buf.set(s.slice(8, 16), 16);
    const si = buf.slice(16);
    const di = buf.slice(16);
    let c = 16;
    while (c > 0) {
        c--;
        di[c] = s[15 - c];
    }
    return di;
}

function sub_e(a: Uint8Array, n: Uint8Array): void {
    const di: Uint8Array = a;
    const si: Uint8Array = n;
    let ax: Uint8Array = si.slice(4);
    for (let i: number = 0; i < 16; i++) {
        let dx: number = ax[(-4 * i) - 4];
        let cx: number = ax[(-4 * i) - 3];
        let r10: number = ax[(-4 * i) - 2];
        let r8: number = ax[(-4 * i) - 1];
        let r9: number = (dx << 1) + (dx << 2);
        let r11: number = (cx << 1) + (cx << 2);
        let bx: number = (r10 << 1) + (r10 << 2);
        let r13: number = dx;
        dx ^= cx;
        cx ^= r10;
        r10 ^= r8;
        let r12: number = di[r9];
        r12 ^= di[1 + r11];
        r10 ^= r8;
        r10 ^= r12;
        a[(-4 * i) - 4] = r10;
        r10 = di[r11];
        r10 ^= di[1 + bx];
        r13 ^= r8;
        r13 ^= r10;
        a[(-4 * i) - 3] = r13;
        r10 = di[bx];
        r8 = (r8 << 1) + (r8 << 2);
        r8 ^= di[1 + r8];
        r10 ^= r8;
        dx ^= r10;
        a[(-4 * i) - 2] = dx;
        dx = di[1 + r9];
        dx ^= di[r8];
        cx ^= dx;
        a[(-4 * i) - 1] = cx;
    }
}

function sub_ab(buf: Buffer, n: number): number {
    const s = buf.readBigUInt64LE(0);
    const w = buf.readBigUInt64LE(8);

    let ax = Number(w >> 32n);
    let cx = Number(w);
    let dx = Number(s);

    let tmp = (cx >> 28) & 0x0f;
    ax |= tmp << 4;
    tmp = (cx >> 24) & 0x0f;
    ax |= tmp << 8;
    tmp = (cx & 0x0f) << 4;
    ax += tmp;
    ax = buf.readUInt32LE(ax);

    tmp = (dx >> 8) & 0x0f;
    cx |= tmp << 4;
    tmp = (dx >> 4) & 0xf0;
    cx |= tmp;
    tmp = dx & 0x0f;
    cx += tmp;
    cx = buf.readUInt32LE(cx);
    cx <<= 8;

    tmp = (dx >> 16) & 0x0f;
    dx |= tmp << 4;
    tmp = (dx >> 12) & 0xf0;
    dx |= tmp;
    tmp = dx & 0x0f;
    dx += tmp;
    dx = buf.readUInt32LE(dx);
    dx <<= 16;

    const result = ax | cx | dx;
    buf.writeUInt32LE(result, -16);

    return result;
}