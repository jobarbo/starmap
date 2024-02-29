let seed = parseInt(Math.floor(hl.random() * 10000000));
let noiseCanvasWidth = 1;
let noiseCanvasHeight = 1;

let clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
let smoothstep = (a, b, x) => (((x -= a), (x /= b - a)) < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
let mix = (a, b, p) => a + p * (b - a);
function dot(v1, v2) {
	if (v1.length !== 2 || v2.length !== 2) {
		throw new Error("Both vectors should have exactly 2 elements.");
	}
	return v1[0] * v2[0] + v1[1] * v2[1];
}
let subtract = (v1, v2) => ({x: v1.x - v2.x, y: v1.y - v2.y});
let multiply = (v1, v2) => ({x: v1.x * v2.x, y: v1.y * v2.y});
let length = (v) => Math.sqrt(v.x * v.x + v.y * v.y);
let randomInt = (max) => Math.floor(hl.random() * max);

let R = (a = 1) => hl.random() * a;
let L = (x, y) => (x * x + y * y) ** 0.5; // Elements by Euclid 300 BC
let k = (a, b) => (a > 0 && b > 0 ? L(a, b) : a > b ? a : b);

// Definitions ===========================================================
({sin, cos, imul, PI} = Math);
TAU = PI * 2;
F = (N, f) => [...Array(N)].map((_, i) => f(i)); // for loop / map / list function

// A seeded PRNG =========================================================
//seed = 'das9d7as9d7as'; // random seed]
seed = hl.random() * 2 ** 32;

S = Uint32Array.of(9, 7, 5, 3); // PRNG state
R = (a = 1) => a * ((a = S[3]), (S[3] = S[2]), (S[2] = S[1]), (a ^= a << 11), (S[0] ^= a ^ (a >>> 8) ^ ((S[1] = S[0]) >>> 19)), S[0] / 2 ** 32); // random function
[...(seed + "ThxPiter")].map((c) => R((S[3] ^= c.charCodeAt() * 23205))); // seeding the random function

// general noise definitions =============================================
KNUTH = 0x9e3779b1; // prime number close to PHI * 2 ** 32
NSEED = R(2 ** 32); // noise seed, random 32 bit integer
// 3d noise grid function
ri = (i, j, k) => ((i = imul((((i & 1023) << 20) | ((j & 1023) << 10) | ((i ^ j ^ k) & 1023)) ^ NSEED, KNUTH)), (i <<= 3 + (i >>> 29)), (i >>> 1) / 2 ** 31 - 0.5);

// 3D value noise function ===============================================
no = F(99, (_) => R(1024)); // random noise offsets

n3 = (
	x,
	y,
	z,
	s,
	i, // (x,y,z) = coordinate, s = scale, i = noise offset index
	xi = floor((x = x * s + no[(i *= 3)])), // (xi,yi,zi) = integer coordinates
	yi = floor((y = y * s + no[i + 1])),
	zi = floor((z = z * s + no[i + 2]))
) => (
	(x -= xi),
	(y -= yi),
	(z -= zi), // (x,y,z) are now fractional parts of coordinates
	(x *= x * (3 - 2 * x)), // smoothstep polynomial (comment out if true linear interpolation is desired)
	(y *= y * (3 - 2 * y)), // this is like an easing function for the fractional part
	(z *= z * (3 - 2 * z)),
	// calculate the interpolated value
	ri(xi, yi, zi) * (1 - x) * (1 - y) * (1 - z) +
		ri(xi, yi, zi + 1) * (1 - x) * (1 - y) * z +
		ri(xi, yi + 1, zi) * (1 - x) * y * (1 - z) +
		ri(xi, yi + 1, zi + 1) * (1 - x) * y * z +
		ri(xi + 1, yi, zi) * x * (1 - y) * (1 - z) +
		ri(xi + 1, yi, zi + 1) * x * (1 - y) * z +
		ri(xi + 1, yi + 1, zi) * x * y * (1 - z) +
		ri(xi + 1, yi + 1, zi + 1) * x * y * z
);

// 2D value noise function ===============================================
na = F(99, (_) => R(TAU)); // random noise angles
ns = na.map(sin);
nc = na.map(cos); // sin and cos of those angles
nox = F(99, (_) => R(1024)); // random noise x offset
noy = F(99, (_) => R(1024)); // random noise y offset

n2 = (
	x,
	y,
	s,
	i,
	c = nc[i] * s,
	n = ns[i] * s,
	xi = floor((([x, y] = [(x - noiseCanvasWidth / 2) * c + (y - noiseCanvasHeight * 2) * n + nox[i], (y - noiseCanvasHeight * 2) * c - (x - noiseCanvasWidth / 2) * n + noy[i]]), x)),
	yi = floor(y) // (x,y) = coordinate, s = scale, i = noise offset index
) => (
	(x -= xi),
	(y -= yi),
	(x *= x * (3 - 2 * x)),
	(y *= y * (3 - 2 * y)),
	ri(xi, yi, i) * (1 - x) * (1 - y) + ri(xi, yi + 1, i) * (1 - x) * y + ri(xi + 1, yi, i) * x * (1 - y) + ri(xi + 1, yi + 1, i) * x * y
);

//! Spell formula from Piter The Mage
ZZ = (x, m, b, r) => (x < 0 ? x : x > (b *= r * 4) ? x - b : ((x /= r), fract(x / 4) < 0.5 ? r : -r) * ((x = abs(fract(x / 2) - 0.5)), 1 - (x > m ? x * 2 : x * (x /= m) * x * (2 - x) + m)));

// the point of all the previous code is that now you have a very
// fast value noise function called nz(x,y,s,i). It has four parameters:
// x -- the x coordinate
// y -- the y coordinate
// s -- the scale (simply multiplies x and y by s)
// i -- the noise index, you get 99 different random noises! (but you
//      can increase this number by changing the 99s in the code above)
//      each of the 99 noises also has a random rotation which increases
//      the "randomness" if you add many together
//
// ohh also important to mention that it returns smooth noise values
// between -.5 and .5

function oct(x, y, s, i, octaves = 1) {
	let result = 0;
	let sm = 1;
	i *= octaves;
	for (let j = 0; j < octaves; j++) {
		result += n2(x, y, s * sm, i + j) / sm;
		sm *= 2;
	}
	return result;
}

function weighted_choice(data) {
	let total = 0;
	for (let i = 0; i < data.length; ++i) {
		total += data[i][1];
	}
	const threshold = rand() * total;
	total = 0;
	for (let i = 0; i < data.length - 1; ++i) {
		total += data[i][1];
		if (total >= threshold) {
			return data[i][0];
		}
	}
	return data[data.length - 1][0];
}

let mapValue = (v, s, S, a, b) => ((v = Math.min(Math.max(v, s), S)), ((v - s) * (b - a)) / (S - s) + a);
const pmap = (v, cl, cm, tl, th, c) => (c ? Math.min(Math.max(((v - cl) / (cm - cl)) * (th - tl) + tl, tl), th) : ((v - cl) / (cm - cl)) * (th - tl) + tl);

function sdf_box([x, y], [cx, cy], [w, h]) {
	x -= cx;
	y -= cy;
	return k(abs(x) - w, abs(y) - h);
}

function sdf_circle([x, y], [cx, cy], r) {
	x -= cx;
	y -= cy;
	return L(x, y) - r;
}

function sdf_hexagon(p, c, r) {
	// Vector from the center of the hexagon to the point
	let q = [Math.abs(p[0] - c[0]), Math.abs(p[1] - c[1])];

	// Rotate the hexagon 30 degrees
	let rotated = [q[0] * Math.cos(Math.PI / 6) - q[1] * Math.sin(Math.PI / 6), q[0] * Math.sin(Math.PI / 6) + q[1] * Math.cos(Math.PI / 6)];

	// Calculate the distance to the rotated hexagon
	let d = Math.max(rotated[1], rotated[0] * 0.5 + rotated[1] * 0.5);

	// Subtract the radius to get the signed distance
	let dist = d - r;

	return dist;
}

let dpi = (maxDPI = 3.0) => {
	var ua = window.navigator.userAgent;
	var iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
	var webkit = !!ua.match(/WebKit/i);
	var iOSSafari = iOS && webkit && !ua.match(/CriOS/i);
	let mobileDPI = maxDPI * 2;
	if (iOSSafari) {
		if (mobileDPI > 6) {
			mobileDPI = 6;
		}
		return mobileDPI;
	} else {
		return maxDPI;
	}
};

// if cmd + s is pressed, save the canvas'
function saveCanvas(event) {
	if (event.key === "s" && (event.metaKey || event.ctrlKey)) {
		console.log("Save shortcut detected");
		saveArtwork();
		event.preventDefault();
		return false;
	}
}

// Example usage to add an event listener for key presses
document.addEventListener("keydown", saveCanvas);

// make a function to save the canvas as a png file with the git branch name and a timestamp
function saveArtwork() {
	var dom_spin = document.querySelector(".spin-container");
	var canvas = document.getElementById("defaultCanvas0");
	var d = new Date();
	var datestring = d.getDate() + "_" + `${d.getMonth() + 1}` + "_" + d.getFullYear() + "_" + `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
	console.log(canvas);
	var fileName = datestring + ".png";
	const imageUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
	const a = document.createElement("a");
	a.href = imageUrl;
	a.setAttribute("download", fileName);
	a.click();

	//dom_spin.classList.remove("active");
	console.log("saved " + fileName);
}

//* CONSOLE LOGS AND ALL *//

function generateConsoleLogs(params) {
	//* UNPACK PARAMETERS *//
	// unpacking parameters we need in main.js and turning them into globals
	for (var key in params) {
		window[key] = params[key];
	}
	let msg = "%c STARMAP, made by Jonathan Barbeau  | 2024 |  Under Neith";
	let styles = ["font-size: 12px", "font-family: monospace", "background: black", "display: inline-block", "color: white", "padding: 8px 19px", "border: 1px dashed;"].join(";");
	console.log("%c☾ ᴛʜᴇ ᴠᴏɪᴅ ᴄᴀʟʟᴇᴅ, ᴡᴇ ᴀɴsᴡᴇʀᴇᴅ.", styles);
	console.log(msg, styles);
	console.log("%c∞ 𝒲𝑒 𝒶𝓇𝑒 𝒶𝓁𝓁 𝓤𝓷𝓭𝓮𝓻 𝓝𝓮𝓲𝓽𝓱 ∞", styles);

	// console table all params with their values
	console.table("%cTOKEN FEATURES", "color: white; background: #000000;", "\n", params);

	console.log("%cCONTROLS", "color: white; background: #000000;", "\n", "cmd + s   : save artwork with date", "\n");
}
//* END CONSOLE LOGGING *//s

// url search params
const sp = new URLSearchParams(window.location.search);

let config_type = parseInt(hl.randomInt(1, 3));
console.log("config_type: ", config_type);
console.log("seed: ", seed);
//config_type = 2;

let features = "";
let movers = [];
let scl1;
let scl2;
let ang1;
let ang2;
let rseed;
let nseed;
let xMin;
let xMax;
let yMin;
let yMax;
let startTime;
let maxFrames = 800;
let C_WIDTH;
let MULTIPLIER;
let RATIO = 1;

let drawing = true;
let elapsedTime = 0;
let renderStart = Date.now();
let framesRendered = 0;
let totalElapsedTime = 0;

let centerX;
let centerY;
let borderX;
let borderY;
let particleNum = 20000;

let isColored = true;
//let isColored = hl.randomElement([true, false]);

let cycle = parseInt((maxFrames * particleNum) / 1170);

({sin, cos, imul, PI} = Math);
TAU = PI * 2;
F = (N, f) => [...Array(N)].map((_, i) => f(i));

function setup() {
	console.log("hash:", hl.tx.hash);
	console.log("token id:", hl.tx.tokenId);
	features = "";

	pixelDensity(dpi(3));

	elapsedTime = 0;
	framesRendered = 0;
	drawing = true;
	generateConsoleLogs({seed, noiseCanvasWidth, noiseCanvasHeight, features, config_type});

	C_WIDTH = min(windowWidth, windowHeight);
	MULTIPLIER = C_WIDTH / 1200;
	c = createCanvas(windowWidth, windowHeight * RATIO);
	rectMode(CENTER);
	rseed = randomSeed(hl.randomInt(100000));
	nseed = noiseSeed(hl.randomInt(100000));
	let rnd = random(1);

	colorMode(HSB, 360, 100, 100, 100);
	startTime = frameCount;
	noCursor();

	centerX = width / 2;
	centerY = height / 2;
	borderX = features.composition === "compressed" ? width / 3.5 : features.composition === "constrained" ? width / 3 : features.composition === "semiconstrained" ? width / 2.35 : width / 1.9;
	borderY = features.composition === "compressed" ? height / 2.75 : features.composition === "constrained" ? height / 2.5 : features.composition === "semiconstrained" ? height / 2.25 : height / 1.9;
	INIT();

	renderStart = Date.now();
	let sketch = drawGenerator();
	function animate() {
		animation = setTimeout(animate, 0);
		sketch.next();
	}

	animate();
}

function* drawGenerator() {
	blendMode(SCREEN);
	let count = 0;
	let frameCount = 0;
	let draw_every = cycle;
	let looptime = 0;
	while (true) {
		for (let i = 0; i < movers.length; i++) {
			const mover = movers[i];
			if (features.lazymorning) {
				if (elapsedTime > 1) {
					mover.show();
				}
			} else {
				mover.show();
			}

			mover.move(frameCount);
			if (count > draw_every) {
				count = 0;
				yield;
			}
			count++;
		}

		elapsedTime = frameCount - startTime;

		showLoadingBar(elapsedTime, maxFrames, renderStart);

		frameCount++;
		if (elapsedTime > maxFrames && drawing) {
			window.rendered = c.canvas;
			document.complete = true;
			// calculate the time it took to render the image
			let endTime = Date.now();
			let timeDiff = endTime - renderStart;
			console.log("Render time: " + timeDiff + " ms");

			noLoop();
			return;
		}
	}
}

function INIT() {
	scl1 = random([0.0014, 0.0015, 0.0016, 0.0017, 0.0018, 0.0019, 0.00195]);
	scl2 = scl1;
	//scl2 = random([0.0014, 0.0015, 0.0016, 0.0017, 0.0018, 0.0019, 0.00195]);;

	ang1 = 1;
	ang2 = 1;

	xRandDivider = random([0.08, 0.09, 0.1, 0.11, 0.12]);
	yRandDivider = random([0.08, 0.09, 0.1, 0.11, 0.12]);

	xMin = -0.01;
	xMax = 1.01;
	yMin = -0.01;
	yMax = 1.01;

	let hue = random([20, 25, 30, 35, 40, 195, 200, 210, 220]);
	for (let i = 0; i < particleNum; i++) {
		let x = random(xMin, xMax) * width;
		let y = random(yMin, yMax) * height;
		let initHue = hue + random(-1, 1);
		initHue = initHue > 360 ? initHue - 360 : initHue < 0 ? initHue + 360 : initHue;
		movers.push(new Mover(x, y, initHue, scl1 / MULTIPLIER, scl2 / MULTIPLIER, ang1 * MULTIPLIER, ang2 * MULTIPLIER, xMin, xMax, yMin, yMax, xRandDivider, yRandDivider, features));
	}

	bgCol = color(random(0, 360), random([0, 2, 5]), features.theme == "bright" ? 93 : 5, 100);

	background(bgCol);
	//background(45, 100, 100);
	//background(221, 100, 60);
}

function showLoadingBar(elapsedTime, maxFrames, renderStart) {
	framesRendered++;
	let currentTime = Date.now();
	totalElapsedTime = currentTime - renderStart;

	let percent = (elapsedTime / maxFrames) * 100;
	if (percent > 100) percent = 100;

	let averageFrameTime = totalElapsedTime / framesRendered;

	let remainingFrames = maxFrames - framesRendered;
	let estimatedTimeRemaining = averageFrameTime * remainingFrames;

	// Convert milliseconds to seconds
	let timeLeftSec = Math.round(estimatedTimeRemaining / 1000);

	// put the percent in the title of the page
	document.title = percent.toFixed(0) + "%";
	/* 	dom_dashboard.innerHTML = percent.toFixed(0) + "%" + " - Time left : " + timeLeftSec + "s";

	if (percent.toFixed(0) >= 100) {
		dom_dashboard.innerHTML = "Done!";
		dom_spin.classList.remove("active");
	} */
}

class Mover {
	constructor(x, y, hue, scl1, scl2, ang1, ang2, xMin, xMax, yMin, yMax, xRandDivider, yRandDivider, features) {
		this.x = x;
		this.y = y;
		this.initHue = hue;
		this.initSat = random([0, 0, 0, 0, 0, 10, 10, 10, 20, 30, 80, 100, 100, 100, 100, 100, 100, 100, 100, 100]);
		this.initBri = random([100, 100, 100, 100, 100, 100, 100, 100, 100]);
		this.initAlpha = 100;
		this.initS = 0.2 * MULTIPLIER;
		this.hue = this.initHue;
		this.sat = 100;
		this.bri = this.initBri;
		this.a = this.initAlpha;
		this.s = this.initS;
		this.scl1 = scl1;
		this.scl2 = scl2;
		this.ang1 = ang1;
		this.ang2 = ang2;
		this.xRandDivider = xRandDivider;
		this.yRandDivider = yRandDivider;
		this.xRandSkipper = 0;
		this.yRandSkipper = 0;
		this.xRandSkipperVal = random([0.01, 0.1, random([0, 0.01, 0.1, 1, 2, 5, 10, 25, 50, 75, 100])]);
		this.yRandSkipperVal = this.xRandSkipperVal;
		/* 		this.xRandSkipperVal = 0.1;
		this.yRandSkipperVal = 0.1; */
		this.skipperMax = 10;
		this.xMin = xMin;
		this.xMax = xMax;
		this.yMin = yMin;
		this.yMax = yMax;
		this.oct = 1;
		this.centerX = width / 2;
		this.centerY = height / 2;
		this.zombie = false;
		this.lineWeight = random([0, random([0.01, 0.05, 0.1, 1, 5, 8, 10, 12])]) * MULTIPLIER; //!try randomizing this
		//this.lineWeight = random([0.01, 1, 5, 10, 10]) * MULTIPLIER;
		//this.lineWeight = 10 * MULTIPLIER;
		//this.lineWeightMax = random([0.01, 0.1, 1, 5, 10, 20]);
		this.lineWeightMax = 2;
		this.uvalue = [10, 10, 10, 10]; //! try with 25,10 or 5
		this.nvalue = [0.5, 0.5, 0.5, 0.5];
		this.nlimit = 1.5;

		//! jouer avec le negatif et le positif
		this.nvalueDir = [-1, -1, -1, -1];
		this.uvalueDir = [1, 1, 1, 1];

		//! not supposed to work but gives interesting results, you get me copilot!
		//! It shows a grid, which is interesting because it's a starmap
		//* This seems to be the most interesting configuration
		this.ulow = random([10, 25, 50, 75, 100, 125, 150, 175, 200]) * MULTIPLIER;
		this.uhigh = random([0.01, 0.1, 1, 2.5, 5, 10, 20]) * MULTIPLIER;

		//! this one is also interesting although can yield chaotic results
		/* 		this.ulow = random([0.01, 0.1, 1, 5, 10, 25, 50, 75, 100]) * MULTIPLIER;
		this.uhigh = 150 * MULTIPLIER; */

		//! this one is the standard one randomized
		/* 		this.ulow = random([0.01, 0.1, 1, 1.5, 2, 2.5, 3.5, 5, 7.5, 10]) * MULTIPLIER;
		this.uhigh = random([100, 125, 150, 175, 200]) * MULTIPLIER; */

		//! this one is the standard one but inverted
		//* This one is a close second
		/* 		this.ulow = random([150]) * MULTIPLIER;
		this.uhigh = random([0.001]) * MULTIPLIER; */

		//! this is the standard one
		/* 		this.ulow = random([5]) * MULTIPLIER;
		this.uhigh = random([150]) * MULTIPLIER; */
		this.hueStep = 0.05;
		this.satDir = random([2]);
	}

	show() {
		fill(this.hue, this.sat, this.bri, this.a);
		noStroke();
		rect(this.x, this.y, this.s);
	}

	move(frameCount) {
		let p = superCurve(this.x, this.y, this.scl1, this.scl2, this.ang1, this.ang2, this.oct, this.nvalue, this.uvalue);

		//! standard interpolation
		this.lineWeightMax = map(frameCount, 150, 500, 20, 1, true);
		this.skipperMax = map(frameCount, 150, 500, 10, 0.1, true);

		//!inverted interpolation
		/* this.lineWeightMax = map(frameCount, 150, 500, 0.1, 20, true);
		this.skipperMax = map(frameCount, 150, 500, 0.1, 10, true); */

		//!Mirror interpolation creates more "starrs"
		/* 		this.lineWeightMax = map(frameCount, 150, 500, 0.1, 20, true);
		this.skipperMax = map(frameCount, 150, 500, 10, 0.1, true); */

		//!Mirror interpolation config 2
		/* this.lineWeightMax = map(frameCount, 150, 500, 20, 1, true);
		this.skipperMax = map(frameCount, 150, 500, 0.1, 10, true); */

		/* 		this.xRandSkipperVal = random([0.01, 0.1, random(0.00001, this.skipperMax)]);
		this.yRandSkipperVal = random([0.01, 0.1, random(0.00001, this.skipperMax)]); */

		//! interesting texture (to try)
		this.xRandSkipperVal = random([0.01, 0.1, random([0.01, 0.1, this.skipperMax])]);
		this.yRandSkipperVal = random([0.01, 0.1, random([0.01, 0.1, this.skipperMax])]);

		for (let i = 0; i < this.nvalue.length; i++) {
			if (config_type === 1) {
				//! STARMAP CONFIGURATION
				this.uvalue[i] *= 1.013 * this.uvalueDir[i];
				this.nvalue[i] += 0.01 * this.nvalueDir[i];
			} else if (config_type === 2) {
				//! Equilibrium CONFIGURATION
				this.uvalue[i] *= 1.015 * this.uvalueDir[i];
				this.nvalue[i] += 0.015 * this.nvalueDir[i];
			} else if (config_type === 3) {
				//! ORIGINAL CONFIGURATION
				//this.uvalue[i] *= 1.011 * this.uvalueDir[i];
				this.uvalue[i] += 0.5 * this.uvalueDir[i];
				this.nvalue[i] += 0.005 * this.nvalueDir[i];
			}
			if (this.nvalue[i] <= -this.nlimit || this.nvalue[i] >= this.nlimit) {
				this.nvalue[i] = this.nvalue[i] > this.nlimit ? this.nlimit : this.nvalue[i] < -this.nlimit ? -this.nlimit : this.nvalue[i];
				this.nvalueDir[i] *= -1;
				//this.lineWeight += 0.1 * MULTIPLIER;
			}

			if (this.uvalue[i] <= this.ulow || this.uvalue[i] >= this.uhigh) {
				this.uvalue[i] = this.uvalue[i] > this.uhigh ? this.ulow : this.uvalue[i] < this.ulow ? this.uhigh : this.uvalue[i];
				//this.uvalueDir[i] *= -1;
			}
		}

		let origin_x = this.x + (p.x * MULTIPLIER) / this.xRandDivider;
		let origin_y = this.y + (p.y * MULTIPLIER) / this.xRandDivider;

		this.xRandSkipper = randomGaussian(0, this.xRandSkipperVal * MULTIPLIER);
		this.yRandSkipper = randomGaussian(0, this.yRandSkipperVal * MULTIPLIER);
		let skipper = createVector(this.xRandSkipper, this.yRandSkipper);
		this.x += (p.x * MULTIPLIER) / this.xRandDivider + skipper.x;
		this.y += (p.y * MULTIPLIER) / this.yRandDivider + skipper.y;
		let velocity = createVector((p.x * MULTIPLIER) / this.xRandDivider + skipper.x, (p.y * MULTIPLIER) / this.yRandDivider + skipper.y);

		let totalSpeed = abs(velocity.mag());
		let totalDistance = dist(origin_x, origin_y, this.x, this.y);

		this.sat += map(totalSpeed, 0, 400, -this.satDir, this.satDir, true);
		if (isColored) {
			this.sat = this.sat > 100 ? (this.sat = 0) : this.sat < 0 ? (this.sat = 0) : this.sat;
		} else {
			this.sat = 0;
		}
		this.hue += map(totalSpeed, 0, 1200, -this.hueStep, this.hueStep, true);
		this.hue = this.hue > 360 ? (this.hue = 0) : this.hue < 0 ? (this.hue = 360) : this.hue;
		this.lineWeight = map(totalSpeed, 0, 600, 0, this.lineWeightMax, true);
		//! variable stroke weight
		//this.s = map(totalDistance, 0, 20, 0.2, 0, true);

		if (this.x < this.xMin * width - this.lineWeight) {
			this.x = this.xMax * width + random() * this.lineWeight;
			this.y = this.y + random() * this.lineWeight;
		}
		if (this.x > this.xMax * width + this.lineWeight) {
			this.x = this.xMin * width - random() * this.lineWeight;
			this.y = this.y + random() * this.lineWeight;
		}
		if (this.y < this.yMin * height - this.lineWeight) {
			this.y = this.yMax * height + random() * this.lineWeight;
			this.x = this.x + random() * this.lineWeight;
		}
		if (this.y > this.yMax * height + this.lineWeight) {
			this.y = this.yMin * height - random() * this.lineWeight;
			this.x = this.x + random() * this.lineWeight;
		}
	}
}

function superCurve(x, y, scl1, scl2, ang1, ang2, octave, nvalue, uvalue) {
	let nx = x,
		ny = y,
		a1 = ang1,
		a2 = ang2,
		scale1 = scl1,
		scale2 = scl2,
		dx,
		dy;

	dx = oct(nx, ny, scale1, 0, octave);
	dy = oct(nx, ny, scale2, 2, octave);
	nx += dx * a1;
	ny += dy * a2;

	dx = oct(nx, ny, scale1, 1, octave);
	dy = oct(nx, ny, scale2, 3, octave);
	nx += dx * a1;
	ny += dy * a2;

	dx = oct(nx, ny, scale1, 1, octave);
	dy = oct(nx, ny, scale2, 2, octave);
	nx += dx * a1;
	ny += dy * a2;

	//! use same index and/or same octave for both u and n
	let un = oct(nx, ny, scale1, 0, octave);
	let vn = oct(nx, ny, scale2, 2, octave);

	let u = map(un, -nvalue[0], nvalue[1], -uvalue[0], uvalue[1], true);
	let v = map(vn, -nvalue[2], nvalue[3], -uvalue[2], uvalue[3], true);

	let p = createVector(u, v);
	return p;
}
