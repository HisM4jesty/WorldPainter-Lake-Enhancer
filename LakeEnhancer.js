// script.name=Lake Enhancer
// script.description=Adds natural islands, underwater relief and seagrass, softer shoreline and optional reed/lily layers
// script.param.seed.type=integer
// script.param.seed.default=1
// script.param.islands.type=integer
// script.param.islands.description=Number of islands (0 = none)
// script.param.islands.default=4
// script.param.islandSize.type=float
// script.param.islandSize.description=Average island radius (blocks)
// script.param.islandSize.default=16
// script.param.islandHeight.type=float
// script.param.islandHeight.description=Average island height above water (blocks)
// script.param.islandHeight.default=2.5
// script.param.islandStyle.type=string
// script.param.islandStyle.description=mixed, grassy or rocky
// script.param.islandStyle.default=mixed
// script.param.islandSpacing.type=float
// script.param.islandSpacing.description=Min distance between islands (blocks)
// script.param.islandSpacing.default=200
// script.param.islandMinShore.type=float
// script.param.islandMinShore.description=Islands only this far from the shore (blocks)
// script.param.islandMinShore.default=45
// script.param.islandMaxDepth.type=float
// script.param.islandMaxDepth.description=Islands only where the water is shallower than this
// script.param.islandMaxDepth.default=14
// script.param.bedRelief.type=float
// script.param.bedRelief.description=Lake bed bumps and dips in blocks (0 = off)
// script.param.bedRelief.default=2
// script.param.seagrass.type=boolean
// script.param.seagrass.description=Paint seagrass (grass terrain) meadows underwater
// script.param.seagrass.default=true
// script.param.shoreVariation.type=float
// script.param.shoreVariation.description=Coves and headlands strength in blocks (0 = off)
// script.param.shoreVariation.default=0.8
// script.param.shoreBand.type=float
// script.param.shoreBand.description=Width of the shoreline effect zone (blocks)
// script.param.shoreBand.default=24
// script.param.reedLayer.type=string
// script.param.reedLayer.description=Custom object layer for reeds ("none" = skip)
// script.param.reedLayer.default=none
// script.param.lilyLayer.type=string
// script.param.lilyLayer.description=Custom object layer for lily pads ("none" = skip)
// script.param.lilyLayer.default=none
// script.param.regionSize.type=integer
// script.param.regionSize.description=Only work inside this square (0 = whole map)
// script.param.regionSize.default=0
// script.param.regionCenterX.type=integer
// script.param.regionCenterX.default=0
// script.param.regionCenterY.type=integer
// script.param.regionCenterY.default=0

function p(name, def) {
    if (typeof params !== 'undefined' && params !== null) {
        var v = params[name];
        if (v !== undefined && v !== null && String(v) !== '') return v;
    }
    return def;
}
var seed        = Number(p('seed', 1));
var nIslands    = Math.round(Number(p('islands', 4)));
var islSize     = Number(p('islandSize', 16));
var islHeight   = Number(p('islandHeight', 2.5));
var islStyle    = String(p('islandStyle', 'mixed')).toLowerCase();
var islSpacing  = Number(p('islandSpacing', 200));
var islMinShore = Number(p('islandMinShore', 45));
var islMaxDepth = Number(p('islandMaxDepth', 14));
var bedRelief   = Number(p('bedRelief', 2));
var seagrass    = String(p('seagrass', 'true')).toLowerCase() === 'true';
var shoreAmp    = Number(p('shoreVariation', 0.8));
var shoreBand   = Number(p('shoreBand', 24));
var reedName    = String(p('reedLayer', 'none')).trim();
var lilyName    = String(p('lilyLayer', 'none')).trim();
var regionSize  = Number(p('regionSize', 0));
var regionCX    = Number(p('regionCenterX', 0));
var regionCY    = Number(p('regionCenterY', 0));

// ---------- terrains ----------
var Terrain = Java.type('org.pepsoft.worldpainter.Terrain');
function resolve(label, names) {
    for (var i = 0; i < names.length; i++) {
        try { return Terrain.valueOf(names[i]); } catch (e) {}
    }
    throw new Error('Terrain not found for ' + label + ' (tried ' + names.join(', ') + ')');
}
var T = {
    GRASS:     resolve('GRASS', ['GRASS']),
    SAND:      resolve('SAND', ['SAND']),
    GRAVEL:    resolve('GRAVEL', ['GRAVEL']),
    CLAY:      resolve('CLAY', ['CLAY', 'GRAVEL']),
    DIRT:      resolve('DIRT', ['DIRT']),
    PODZOL:    resolve('PODZOL', ['PODZOL', 'DIRT']),
    COARSE:    resolve('COARSE', ['COARSE_DIRT', 'PERMADIRT', 'DIRT']),
    STONE_MIX: resolve('STONE_MIX', ['STONE_MIX', 'ROCK', 'STONE']),
    ANDESITE:  resolve('ANDESITE', ['ANDESITE', 'STONE']),
    COBBLE:    resolve('COBBLE', ['COBBLESTONE', 'STONE'])
};

// ---------- helpers ----------
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function hash(ix, iy, s) {
    var v = Math.sin(ix * 127.1 + iy * 311.7 + s * 74.7) * 43758.5453;
    return v - Math.floor(v);
}
function vnoise(x, y, scale, s) {
    var fx = x / scale, fy = y / scale;
    var ix = Math.floor(fx), iy = Math.floor(fy);
    var tx = fx - ix, ty = fy - iy;
    tx = tx * tx * (3 - 2 * tx);
    ty = ty * ty * (3 - 2 * ty);
    var a = hash(ix, iy, s), b = hash(ix + 1, iy, s);
    var c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}
function fbm(x, y, scale, s) {
    return 0.6 * vnoise(x, y, scale, s) + 0.3 * vnoise(x, y, scale / 2.3, s + 17) + 0.1 * vnoise(x, y, scale / 5, s + 31);
}
function pick(opts, r) {
    var tot = 0, i;
    for (i = 0; i < opts.length; i++) tot += opts[i][1];
    var t = r * tot, acc = 0;
    for (i = 0; i < opts.length; i++) {
        acc += opts[i][1];
        if (t < acc) return opts[i][0];
    }
    return opts[opts.length - 1][0];
}
var FMIN = java.lang.Float.MIN_VALUE;
function hAt(x, y) {
    var h = dimension.getHeightAt(x, y);
    if (!(h > -1e6) || h === FMIN) return NaN;
    return h;
}

function findLayer(name) {
    var want = String(name).trim().toLowerCase();
    var lists = [];
    try { lists.push(dimension.getCustomLayers().toArray()); } catch (e1) {}
    try { lists.push(dimension.getAllLayers(false).toArray()); } catch (e2) {}
    for (var a = 0; a < lists.length; a++) {
        for (var b = 0; b < lists[a].length; b++) {
            var L = lists[a][b];
            if (String(L.getName()).trim().toLowerCase() === want) return L;
        }
    }
    try {
        var l3 = wp.getLayer().fromWorld(world).withName(name).go();
        if (l3 !== null && l3 !== undefined) return l3;
    } catch (e3) {}
    return null;
}
function setupLayer(name) {
    if (name === '' || name.toLowerCase() === 'none') return null;
    var L = findLayer(name);
    if (L === null) { print('Layer not found (skipped): ' + name); return null; }
    var mv = 15;
    try { if (String(L.getDataSize().name()).indexOf('BIT') >= 0) mv = 1; } catch (e) {}
    return { lay: L, max: mv, has: false, count: 0 };
}
var reed = setupLayer(reedName);
var lily = setupLayer(lilyName);

// ---------- grid over the whole map ----------
var TILE = 128;
var tiles = dimension.getTiles().toArray();
var txmin = 1e9, txmax = -1e9, tymin = 1e9, tymax = -1e9;
for (var t0 = 0; t0 < tiles.length; t0++) {
    var ttx = tiles[t0].getX(), tty = tiles[t0].getY();
    if (ttx < txmin) txmin = ttx; if (ttx > txmax) txmax = ttx;
    if (tty < tymin) tymin = tty; if (tty > tymax) tymax = tty;
}
var gx0 = txmin * TILE, gy0 = tymin * TILE;
var Wb = (txmax - txmin + 1) * TILE, Hb = (tymax - tymin + 1) * TILE;
var wcs = 4;
if ((Wb / wcs) * (Hb / wcs) > 5000000) wcs = 6;
if ((Wb / wcs) * (Hb / wcs) > 5000000) wcs = 8;
var W = Math.ceil(Wb / wcs), H = Math.ceil(Hb / wcs), N = W * H;
print('Analysis grid: ' + W + ' x ' + H + ' (' + wcs + ' blocks per cell)');

var FA = Java.type('float[]'), IA = Java.type('int[]'), BA = Java.type('byte[]');
var water = new BA(N), lvl = new FA(N), depthC = new FA(N), hC = new FA(N);
var dL = new IA(N), dW = new IA(N), lvN = new FA(N), sd = new FA(N);
var INF = 1000000000, NEG = -1000000000;
var i, j, k;

for (j = 0; j < H; j++) {
    if (java.lang.Thread.interrupted()) throw new Error('Interrupted');
    for (i = 0; i < W; i++) {
        k = j * W + i;
        var cx = Math.floor(gx0 + (i + 0.5) * wcs), cy = Math.floor(gy0 + (j + 0.5) * wcs);
        var h0 = hAt(cx, cy);
        if (isNaN(h0)) continue;
        hC[k] = h0;
        var w0 = dimension.getWaterLevelAt(cx, cy);
        if (w0 > h0) { water[k] = 1; lvl[k] = w0; depthC[k] = w0 - h0; }
    }
}

function chamfer(dist, aux) {
    var a, d, ii, jj, kk;
    for (jj = 0; jj < H; jj++) {
        for (ii = 0; ii < W; ii++) {
            kk = jj * W + ii; d = dist[kk]; a = aux ? aux[kk] : 0;
            if (ii > 0 && dist[kk - 1] + 3 < d) { d = dist[kk - 1] + 3; if (aux) a = aux[kk - 1]; }
            if (jj > 0) {
                if (dist[kk - W] + 3 < d) { d = dist[kk - W] + 3; if (aux) a = aux[kk - W]; }
                if (ii > 0 && dist[kk - W - 1] + 4 < d) { d = dist[kk - W - 1] + 4; if (aux) a = aux[kk - W - 1]; }
                if (ii < W - 1 && dist[kk - W + 1] + 4 < d) { d = dist[kk - W + 1] + 4; if (aux) a = aux[kk - W + 1]; }
            }
            dist[kk] = d; if (aux) aux[kk] = a;
        }
    }
    for (jj = H - 1; jj >= 0; jj--) {
        for (ii = W - 1; ii >= 0; ii--) {
            kk = jj * W + ii; d = dist[kk]; a = aux ? aux[kk] : 0;
            if (ii < W - 1 && dist[kk + 1] + 3 < d) { d = dist[kk + 1] + 3; if (aux) a = aux[kk + 1]; }
            if (jj < H - 1) {
                if (dist[kk + W] + 3 < d) { d = dist[kk + W] + 3; if (aux) a = aux[kk + W]; }
                if (ii < W - 1 && dist[kk + W + 1] + 4 < d) { d = dist[kk + W + 1] + 4; if (aux) a = aux[kk + W + 1]; }
                if (ii > 0 && dist[kk + W - 1] + 4 < d) { d = dist[kk + W - 1] + 4; if (aux) a = aux[kk + W - 1]; }
            }
            dist[kk] = d; if (aux) aux[kk] = a;
        }
    }
}

// signed distance to the shore: positive inside the water, negative on land
function buildFields() {
    var q;
    for (q = 0; q < N; q++) {
        if (water[q]) { dL[q] = INF; dW[q] = 0; lvN[q] = lvl[q]; }
        else          { dL[q] = 0; dW[q] = INF; lvN[q] = NEG; }
    }
    chamfer(dL, null);
    chamfer(dW, lvN);
    for (q = 0; q < N; q++) {
        if (water[q]) sd[q] = dL[q] >= INF ? 99999 : dL[q] / 3 * wcs;
        else          sd[q] = dW[q] >= INF ? -99999 : -(dW[q] / 3 * wcs);
    }
}
buildFields();

function bil(arr, x, y) {
    var fx = (x - gx0) / wcs - 0.5, fy = (y - gy0) / wcs - 0.5;
    var ii = Math.floor(fx), jj = Math.floor(fy);
    var tx = fx - ii, ty = fy - jj;
    if (ii < 0) { ii = 0; tx = 0; }
    if (jj < 0) { jj = 0; ty = 0; }
    if (ii >= W - 1) { ii = W - 2; tx = 1; }
    if (jj >= H - 1) { jj = H - 2; ty = 1; }
    var kk = jj * W + ii;
    var a = arr[kk], b = arr[kk + 1], c = arr[kk + W], d = arr[kk + W + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

// ---------- region ----------
var rx1 = -1e9, rx2 = 1e9, ry1 = -1e9, ry2 = 1e9;
if (regionSize > 0) {
    rx1 = regionCX - regionSize / 2; rx2 = regionCX + regionSize / 2;
    ry1 = regionCY - regionSize / 2; ry2 = regionCY + regionSize / 2;
    print('Region: x ' + rx1 + '..' + rx2 + ', y ' + ry1 + '..' + ry2);
}

// ---------- islands ----------
var gP = 0;
function islandAt(I, x, y, bedH, lv) {
    var dx = x + 0.5 - I.cx, dy = y + 0.5 - I.cy;
    var u = dx * I.ca + dy * I.sa, v = -dx * I.sa + dy * I.ca;
    var a1 = u / (I.R * I.asp), b1 = v / I.R;
    var dn = Math.sqrt(a1 * a1 + b1 * b1);
    if (dn > 1.7) return NaN;
    var lob = (vnoise(x, y, I.R * 1.1, seed + 500 + I.id * 7) - 0.5) * 0.7
            + (vnoise(x, y, I.R * 0.4, seed + 600 + I.id * 7) - 0.5) * 0.3;
    var de = dn + lob;
    var sh = smooth((1.6 - de) / 0.7);
    var shelfLevel = lv - 1.3;
    var base = bedH;
    if (bedH < shelfLevel) base = bedH + (shelfLevel - bedH) * sh;
    var pp = 1 - de;
    gP = pp;
    var res = base;
    if (pp > 0) {
        var s = smooth(pp / 0.8);
        var top = lv + I.peak * (0.45 + 0.55 * smooth(pp / 0.9))
                + (vnoise(x, y, 6, seed + 700 + I.id * 7) - 0.5) * I.rough;
        var tgt = base + (top - base) * s;
        if (tgt > res) res = tgt;
    }
    return res;
}

var islands = [];
if (nIslands > 0) {
    var cands = [], stepC = Math.max(1, Math.round(24 / wcs));
    for (j = 0; j < H; j += stepC) {
        for (i = 0; i < W; i += stepC) {
            k = j * W + i;
            if (!water[k]) continue;
            if (sd[k] < islMinShore) continue;
            if (depthC[k] < 1.5 || depthC[k] > islMaxDepth) continue;
            var ccx = gx0 + (i + 0.5) * wcs, ccy = gy0 + (j + 0.5) * wcs;
            if (ccx < rx1 || ccx >= rx2 || ccy < ry1 || ccy >= ry2) continue;
            cands.push([ccx, ccy, hash(i, j, seed + 77), k]);
        }
    }
    cands.sort(function (a, b) { return a[2] - b[2]; });
    print('Island candidate spots: ' + cands.length);
    for (var ci = 0; ci < cands.length && islands.length < nIslands; ci++) {
        var okSp = true;
        for (var si = 0; si < islands.length; si++) {
            var ddx = cands[ci][0] - islands[si].cx, ddy = cands[ci][1] - islands[si].cy;
            if (Math.sqrt(ddx * ddx + ddy * ddy) < islSpacing) { okSp = false; break; }
        }
        if (!okSp) continue;
        var id = islands.length + 1;
        var style = islStyle;
        if (style !== 'grassy' && style !== 'rocky') style = (hash(id, 4, seed) < 0.6) ? 'grassy' : 'rocky';
        var R = islSize * (0.6 + 0.9 * hash(id, 1, seed));
        var asp = 1 + 1.1 * hash(id, 2, seed);
        var ang = hash(id, 3, seed) * Math.PI;
        var I = {
            id: id, cx: cands[ci][0], cy: cands[ci][1], R: R, asp: asp,
            ca: Math.cos(ang), sa: Math.sin(ang), style: style,
            peak: islHeight * (0.6 + 0.9 * hash(id, 5, seed)) + (style === 'rocky' ? 1.5 : 0),
            rough: style === 'rocky' ? 2.0 : 0.8
        };
        I.reach = R * asp * 1.75 + 6;
        islands.push(I);
        print('Island ' + id + ' (' + style + '): x ' + Math.round(I.cx) + ', y ' + Math.round(I.cy) +
              ', radius ~' + Math.round(R) + ', height ~' + I.peak.toFixed(1));
    }
    if (islands.length === 0) {
        print('No suitable spot for islands. Lower islandMinShore or raise islandMaxDepth.');
    } else {
        // mark island land in the analysis grid, then recompute distances
        for (var ii2 = 0; ii2 < islands.length; ii2++) {
            var Is = islands[ii2];
            var gi0 = Math.max(0, Math.floor((Is.cx - Is.reach - gx0) / wcs));
            var gi1 = Math.min(W - 1, Math.ceil((Is.cx + Is.reach - gx0) / wcs));
            var gj0 = Math.max(0, Math.floor((Is.cy - Is.reach - gy0) / wcs));
            var gj1 = Math.min(H - 1, Math.ceil((Is.cy + Is.reach - gy0) / wcs));
            for (j = gj0; j <= gj1; j++) {
                for (i = gi0; i <= gi1; i++) {
                    k = j * W + i;
                    if (!water[k]) continue;
                    var px = gx0 + (i + 0.5) * wcs, py = gy0 + (j + 0.5) * wcs;
                    var tg = islandAt(Is, Math.floor(px), Math.floor(py), hC[k], lvl[k]);
                    if (!isNaN(tg) && tg > lvl[k] + 0.2) water[k] = 0;
                }
            }
        }
        buildFields();
    }
}

// ---------- terrain pickers ----------
function beachTerrain(wn) { return pick([[T.SAND, 50], [T.GRAVEL, 35], [T.COARSE, 15]], wn); }
function islandTerrain(I, a, pp, wn) {
    if (I.style === 'rocky') {
        if (a < 0.8) return pick([[T.GRAVEL, 55], [T.STONE_MIX, 45]], wn);
        return pick([[T.STONE_MIX, 35], [T.ANDESITE, 25], [T.COBBLE, 15], [T.GRAVEL, 15], [T.GRASS, 10]], wn);
    }
    if (a < 0.9) return pick([[T.SAND, 45], [T.GRAVEL, 40], [T.COARSE, 15]], wn);
    if (pp > 0.25 || a > 1.5) return pick([[T.GRASS, 60], [T.PODZOL, 15], [T.COARSE, 25]], wn);
    return pick([[T.COARSE, 50], [T.GRASS, 35], [T.GRAVEL, 15]], wn);
}
function underTerrain(x, y, d, wn) {
    var nG = seagrass ? fbm(x, y, 35, seed + 1) : 0;
    var nS = fbm(x, y, 60, seed + 2);
    var nR = fbm(x, y, 25, seed + 3);
    if (d <= 1.5) {
        if (nG > 0.62) return pick([[T.GRASS, 60], [T.SAND, 25], [T.GRAVEL, 15]], wn);
        return pick([[T.SAND, 55], [T.GRAVEL, 35], [T.GRASS, seagrass ? 10 : 0]], wn);
    }
    if (d <= 5) {
        if (nG > 0.58) return pick([[T.GRASS, 65], [T.GRAVEL, 20], [T.SAND, 15]], wn);
        if (nS > 0.62) return pick([[T.SAND, 70], [T.GRAVEL, 30]], wn);
        return pick([[T.GRAVEL, 45], [T.SAND, 25], [T.CLAY, 20], [T.GRASS, seagrass ? 10 : 0]], wn);
    }
    if (nR > 0.68) return pick([[T.STONE_MIX, 40], [T.COBBLE, 30], [T.GRAVEL, 30]], wn);
    return pick([[T.GRAVEL, 40], [T.CLAY, 30], [T.DIRT, 30]], wn);
}

function tileNear(tx, ty) {
    var i0 = Math.max(0, Math.floor((tx * TILE - gx0) / wcs));
    var i1 = Math.min(W - 1, Math.ceil(((tx + 1) * TILE - gx0) / wcs));
    var j0 = Math.max(0, Math.floor((ty * TILE - gy0) / wcs));
    var j1 = Math.min(H - 1, Math.ceil(((ty + 1) * TILE - gy0) / wcs));
    var lim = -(shoreBand + wcs + 2);
    for (var jj = j0; jj <= j1; jj++) {
        for (var ii = i0; ii <= i1; ii++) {
            var kk = jj * W + ii;
            if (water[kk] || sd[kk] > lim) return true;
        }
    }
    return false;
}

// ---------- main pass ----------
var nMod = 0, nIslandLand = 0, nFlooded = 0, tilesDone = 0;
for (var ti = 0; ti < tiles.length; ti++) {
    if (java.lang.Thread.interrupted()) { print('Interrupted.'); break; }
    var tile = tiles[ti];
    var tx0 = tile.getX(), ty0 = tile.getY();
    var x0 = tx0 * TILE, y0 = ty0 * TILE;
    if (x0 + TILE < rx1 || x0 > rx2 || y0 + TILE < ry1 || y0 > ry2) continue;

    var tIsl = [];
    for (var q = 0; q < islands.length; q++) {
        var Iq = islands[q];
        if (Iq.cx + Iq.reach < x0 || Iq.cx - Iq.reach > x0 + TILE || Iq.cy + Iq.reach < y0 || Iq.cy - Iq.reach > y0 + TILE) continue;
        tIsl.push(Iq);
    }
    if (tIsl.length === 0 && !tileNear(tx0, ty0)) continue;
    tilesDone++;
    if (reed) reed.has = tile.hasLayer(reed.lay);
    if (lily) lily.has = tile.hasLayer(lily.lay);

    for (var dy = 0; dy < TILE; dy++) {
        for (var dx = 0; dx < TILE; dx++) {
            var x = x0 + dx, y = y0 + dy;
            if (x < rx1 || x >= rx2 || y < ry1 || y >= ry2) continue;

            var h = hAt(x, y);
            if (isNaN(h)) continue;
            var w = dimension.getWaterLevelAt(x, y);
            var wat0 = w > h;
            var sdv = bil(sd, x + 0.5, y + 0.5);
            if (!wat0 && sdv < -(shoreBand + 1)) continue;

            var lv = wat0 ? w : bil(lvN, x + 0.5, y + 0.5);
            var hasLake = lv > -1e8;
            var hNew = h;
            var wn = hash(x, y, seed + 101);

            // lake bed relief
            if (wat0 && bedRelief > 0) {
                var d0 = w - h;
                if (d0 >= 1.5 && sdv > 6) {
                    var nb = fbm(x, y, 70, seed + 21) * 0.65 + vnoise(x, y, 25, seed + 22) * 0.35;
                    var fr = smooth((sdv - 6) / 20) * smooth((d0 - 1.5) / 3);
                    hNew = Math.min(w - 1, h + (nb - 0.5) * 2 * bedRelief * fr);
                }
            }

            // islands
            var ib = null, ibP = 0;
            if (wat0 && tIsl.length > 0) {
                for (var qq = 0; qq < tIsl.length; qq++) {
                    var t1 = islandAt(tIsl[qq], x, y, hNew, w);
                    if (!isNaN(t1) && t1 > hNew + 0.001) { hNew = t1; ib = tIsl[qq]; ibP = gP; }
                }
            }

            // coves and headlands
            if (shoreAmp > 0 && hasLake) {
                var ad = Math.abs(sdv);
                if (ad < shoreBand) {
                    var fo = 1 - smooth(ad / shoreBand);
                    var ns = fbm(x, y, 45, seed + 31);
                    hNew += (ns - 0.5) * 2 * shoreAmp * fo;
                }
            }

            if (Math.abs(hNew - h) > 0.01) { dimension.setHeightAt(x, y, hNew); nMod++; }

            // water level / flooding of lowered land
            var finalWater, lvF;
            if (wat0) { finalWater = (w > hNew); lvF = w; }
            else {
                finalWater = (hasLake && hNew < lv);
                lvF = lv;
                if (finalWater) { dimension.setWaterLevelAt(x, y, Math.round(lv)); nFlooded++; }
            }

            // terrain
            if (finalWater) {
                dimension.setTerrainAt(x, y, underTerrain(x, y, lvF - hNew, wn));
            } else if (wat0) {
                if (ib !== null) { dimension.setTerrainAt(x, y, islandTerrain(ib, hNew - w, ibP, wn)); nIslandLand++; }
                else dimension.setTerrainAt(x, y, beachTerrain(wn));
            }

            // optional reed / lily layers
            if (reed) {
                var rv = 0;
                if (finalWater) {
                    var dr = lvF - hNew;
                    if (dr >= 0.3 && dr <= 2.2 && sdv <= 10) {
                        var nr = fbm(x, y, 16, seed + 41);
                        if (nr > 0.45) rv = Math.max(1, Math.round(reed.max * 0.7 * smooth((nr - 0.45) / 0.15)));
                    }
                }
                var rcur = reed.has ? dimension.getLayerValueAt(reed.lay, x, y) : 0;
                if (rcur !== rv) { dimension.setLayerValueAt(reed.lay, x, y, rv); if (rv > 0) reed.has = true; }
                if (rv > 0) reed.count++;
            }
            if (lily) {
                var lvv = 0;
                if (finalWater) {
                    var dl = lvF - hNew;
                    if (dl >= 0.8 && dl <= 4.5 && sdv >= 4 && sdv <= 50) {
                        var nl = fbm(x, y, 26, seed + 51);
                        if (nl > 0.56) lvv = Math.max(1, Math.round(lily.max * 0.6 * smooth((nl - 0.56) / 0.15)));
                    }
                }
                var lcur = lily.has ? dimension.getLayerValueAt(lily.lay, x, y) : 0;
                if (lcur !== lvv) { dimension.setLayerValueAt(lily.lay, x, y, lvv); if (lvv > 0) lily.has = true; }
                if (lvv > 0) lily.count++;
            }
        }
    }
    if (tilesDone % 20 === 0) print('Tiles processed: ' + tilesDone);
}

print('Done. Tiles processed: ' + tilesDone + ' | height changes: ' + nMod +
      ' | island land blocks: ' + nIslandLand + ' | flooded shore blocks: ' + nFlooded);
if (reed) print('Reed layer blocks: ' + reed.count);
if (lily) print('Lily layer blocks: ' + lily.count);
