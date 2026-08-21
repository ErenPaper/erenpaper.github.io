"use client";

// Engineering-console wallpaper: pure CSS/SVG — instrument grid, PCB traces,
// silkscreen labels, and a few blinking status LEDs. No WebGL, no rAF loop;
// deliberately cheaper than the starfield since the pro desktop sits inside
// the CRT shell with plenty already moving.
export default function ProWallpaper() {
  return (
    <div id="os-wallpaper" className="pro-wallpaper" aria-hidden>
      <div className="pcb-traces" />
      <span className="silk silk-a">RR-01 · REV C</span>
      <span className="silk silk-b">3V3</span>
      <span className="silk silk-c">GND</span>
      <span className="silk silk-d">JTAG</span>
      <span className="led led-a" />
      <span className="led led-b" />
      <span className="led led-c" />
    </div>
  );
}
