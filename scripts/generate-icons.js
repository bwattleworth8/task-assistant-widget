const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const mainProcessPath = path.join(projectRoot, "src", "main.js");
const buildDir = path.join(projectRoot, "build");
const iconPngPath = path.join(buildDir, "icon.png");
const iconIcoPath = path.join(buildDir, "icon.ico");

function getAppIconPng() {
  const mainSource = fs.readFileSync(mainProcessPath, "utf8");
  const match = mainSource.match(
    /const APP_ICON_DATA_URL\s*=\s*"data:image\/png;base64,([^"]+)";/
  );

  if (!match) {
    throw new Error("Could not find APP_ICON_DATA_URL in src/main.js.");
  }

  return Buffer.from(match[1], "base64");
}

function getPngDimensions(pngBuffer) {
  const pngSignature = "89504e470d0a1a0a";

  if (pngBuffer.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error("App icon data is not a valid PNG.");
  }

  return {
    width: pngBuffer.readUInt32BE(16),
    height: pngBuffer.readUInt32BE(20)
  };
}

function createIcoFromPng(pngBuffer) {
  const { width, height } = getPngDimensions(pngBuffer);
  const icoHeaderSize = 22;
  const icoHeader = Buffer.alloc(icoHeaderSize);

  icoHeader.writeUInt16LE(0, 0);
  icoHeader.writeUInt16LE(1, 2);
  icoHeader.writeUInt16LE(1, 4);
  icoHeader.writeUInt8(width >= 256 ? 0 : width, 6);
  icoHeader.writeUInt8(height >= 256 ? 0 : height, 7);
  icoHeader.writeUInt8(0, 8);
  icoHeader.writeUInt8(0, 9);
  icoHeader.writeUInt16LE(1, 10);
  icoHeader.writeUInt16LE(32, 12);
  icoHeader.writeUInt32LE(pngBuffer.length, 14);
  icoHeader.writeUInt32LE(icoHeaderSize, 18);

  return Buffer.concat([icoHeader, pngBuffer]);
}

fs.mkdirSync(buildDir, { recursive: true });

const iconPng = getAppIconPng();
fs.writeFileSync(iconPngPath, iconPng);
fs.writeFileSync(iconIcoPath, createIcoFromPng(iconPng));

console.log(`Generated ${path.relative(projectRoot, iconPngPath)}`);
console.log(`Generated ${path.relative(projectRoot, iconIcoPath)}`);
