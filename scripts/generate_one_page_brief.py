#!/usr/bin/env python3
"""Generate a one-page market brief PDF for institutional morning meetings."""

from __future__ import annotations

import datetime as dt
import json
import os
import urllib.parse
import urllib.request
from dataclasses import dataclass

from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


@dataclass
class Snapshot:
    symbol: str
    last: float
    d1: float
    w1: float
    ytd: float


def fetch_series(symbol: str, rng: str = "1y", interval: str = "1d") -> list[tuple[dt.date, float]]:
    encoded = urllib.parse.quote(symbol, safe="")
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}?range={rng}&interval={interval}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    data = json.loads(urllib.request.urlopen(req, timeout=30).read().decode())
    result = data["chart"]["result"][0]
    timestamps = result["timestamp"]
    closes = result["indicators"]["quote"][0]["close"]

    series: list[tuple[dt.date, float]] = []
    for ts, close in zip(timestamps, closes):
        if close is None:
            continue
        series.append((dt.datetime.fromtimestamp(ts, dt.UTC).date(), float(close)))
    if len(series) < 2:
        raise ValueError(f"Not enough data for {symbol}")
    return series


def nearest_price(series: list[tuple[dt.date, float]], target: dt.date) -> float:
    candidates = [price for date, price in series if date <= target]
    if not candidates:
        return series[0][1]
    return candidates[-1]


def snapshot(symbol: str) -> Snapshot:
    series = fetch_series(symbol)
    last_date, last = series[-1]
    prev = series[-2][1]
    week_base = nearest_price(series, last_date - dt.timedelta(days=7))
    ytd_base = nearest_price(series, dt.date(last_date.year - 1, 12, 31))
    return Snapshot(
        symbol=symbol,
        last=last,
        d1=(last / prev - 1) * 100,
        w1=(last / week_base - 1) * 100,
        ytd=(last / ytd_base - 1) * 100,
    )


def draw_title(c: canvas.Canvas, width: float, height: float, as_of: dt.date) -> None:
    c.setFont("Helvetica-Bold", 18)
    c.drawString(28, height - 34, "Blackstone-Oriented Market Morning Brief")
    c.setFont("Helvetica", 10)
    c.drawString(28, height - 50, f"As of US close: {as_of.isoformat()}")
    c.drawString(28, height - 63, f"Generated: {dt.datetime.now(dt.UTC).strftime('%Y-%m-%d %H:%M UTC')}")
    c.setStrokeColorRGB(0.65, 0.65, 0.65)
    c.line(24, height - 72, width - 24, height - 72)


def draw_chart(c: canvas.Canvas, path: str, x: float, y: float, w: float, h: float, title: str) -> None:
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x, y + h + 5, title)
    if os.path.exists(path):
        c.drawImage(ImageReader(path), x, y, width=w, height=h, preserveAspectRatio=True, anchor="c")
    else:
        c.setStrokeColorRGB(0.8, 0.2, 0.2)
        c.rect(x, y, w, h, stroke=1, fill=0)
        c.setFont("Helvetica", 9)
        c.drawString(x + 6, y + h / 2, f"Missing image: {path}")


def draw_summary(c: canvas.Canvas, x: float, y_top: float, snaps: dict[str, Snapshot], yields: dict[str, float]) -> None:
    line_h = 14
    c.setFont("Helvetica-Bold", 12)
    c.drawString(x, y_top, "Desk Takeaways")

    c.setFont("Helvetica", 10)
    y = y_top - 20
    bullets = [
        f"Risk rally intact: SPX {snaps['^GSPC'].w1:+.2f}% WTD, NDX {snaps['^NDX'].w1:+.2f}% WTD, VIX {snaps['^VIX'].last:.2f}.",
        f"Rates easing: 10Y UST at {yields['^TNX']:.3f}%, supporting duration-sensitive assets.",
        f"Cross-asset: DXY {snaps['DX-Y.NYB'].w1:+.2f}% WTD and GLD {snaps['GLD'].ytd:+.2f}% YTD.",
        "Private credit and RE proxies remain constructive; keep hedges for macro tail risk.",
    ]
    for text in bullets:
        c.circle(x + 2, y + 2, 1.5, stroke=1, fill=1)
        c.drawString(x + 8, y, text)
        y -= line_h

    y -= 6
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x, y, "Snapshot Table")
    y -= 14

    c.setFont("Helvetica-Bold", 9)
    c.drawString(x, y, "Asset")
    c.drawString(x + 70, y, "Last")
    c.drawString(x + 125, y, "1D")
    c.drawString(x + 170, y, "1W")
    c.drawString(x + 215, y, "YTD")
    y -= 10
    c.line(x, y, x + 250, y)
    y -= 12

    rows = [
        ("SPX", snaps["^GSPC"]),
        ("NDX", snaps["^NDX"]),
        ("RUT", snaps["^RUT"]),
        ("VIX", snaps["^VIX"]),
        ("DXY", snaps["DX-Y.NYB"]),
        ("GLD", snaps["GLD"]),
    ]
    c.setFont("Helvetica", 9)
    for name, s in rows:
        c.drawString(x, y, name)
        c.drawRightString(x + 110, y, f"{s.last:,.2f}")
        c.drawRightString(x + 155, y, f"{s.d1:+.2f}%")
        c.drawRightString(x + 200, y, f"{s.w1:+.2f}%")
        c.drawRightString(x + 245, y, f"{s.ytd:+.2f}%")
        y -= 13

    y -= 8
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x, y, "UST Curve")
    y -= 14
    c.setFont("Helvetica", 9)
    c.drawString(x, y, f"5Y: {yields['^FVX']:.3f}%")
    c.drawString(x + 70, y, f"10Y: {yields['^TNX']:.3f}%")
    c.drawString(x + 150, y, f"30Y: {yields['^TYX']:.3f}%")


def main() -> None:
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    chart_dir = os.path.join(project_root, "charts")
    out_dir = os.path.join(project_root, "reports")
    os.makedirs(out_dir, exist_ok=True)

    watched = ["^GSPC", "^NDX", "^RUT", "^VIX", "DX-Y.NYB", "GLD"]
    snaps = {symbol: snapshot(symbol) for symbol in watched}
    yields = {symbol: snapshot(symbol).last for symbol in ["^FVX", "^TNX", "^TYX"]}
    as_of = fetch_series("^GSPC", rng="1mo")[-1][0]

    output_path = os.path.join(out_dir, f"blackstone_one_page_brief_{as_of.isoformat()}.pdf")
    c = canvas.Canvas(output_path, pagesize=landscape(A4))
    width, height = landscape(A4)

    draw_title(c, width, height, as_of)

    draw_chart(
        c,
        os.path.join(chart_dir, "chart1.png"),
        x=28,
        y=height - 282,
        w=360,
        h=180,
        title="1) US Equities (1M normalized)",
    )
    draw_chart(
        c,
        os.path.join(chart_dir, "chart2.png"),
        x=402,
        y=height - 282,
        w=250,
        h=180,
        title="2) UST Yield Curve",
    )
    draw_chart(
        c,
        os.path.join(chart_dir, "chart3.png"),
        x=28,
        y=78,
        w=360,
        h=180,
        title="3) Key Sector / Asset YTD",
    )

    draw_summary(c, x=402, y_top=286, snaps=snaps, yields=yields)

    c.showPage()
    c.save()
    print(output_path)


if __name__ == "__main__":
    main()
