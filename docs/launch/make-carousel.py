"""Build original vector carousel artwork. No external images or paid services."""
from pathlib import Path
from html import escape

slides = [
    ('TOO TIRED TO DECIDE?', ['Dinner can', 'be simple.'], ['Three familiar ideas for', 'a low-energy evening.'], 'Swipe for ideas'),
    ('IDEA 01', ['A sandwich.', 'A side of chips.'], ['Use a filling you enjoy.', 'Dinner does not have to be a project.'], 'Familiar food counts'),
    ('IDEA 02', ['Butter noodles.', 'An easy side.'], ['Keep it simple with noodles,', 'butter, and something you like alongside.'], 'Start with what sounds good'),
    ('IDEA 03', ['Breakfast.', 'For dinner.'], ['Eggs and toast. Or pancakes.', 'Your evening, your choice.'], 'There is no wrong time for toast'),
    ('LESS DECIDING. MORE EATING.', ['Want help', 'choosing?'], ['Three ideas. Keep a favorite.', 'Refresh the rest.'], 'Mealsolved · Android testing'),
]
out = Path(__file__).parent / 'carousel-01'
out.mkdir(exist_ok=True)
for i, (eyebrow, title, body, footer) in enumerate(slides, 1):
    title_svg = ''.join(f'<tspan x="88" y="{380+j*118}">{escape(line)}</tspan>' for j, line in enumerate(title))
    body_svg = ''.join(f'<tspan x="88" y="{730+j*62}">{escape(line)}</tspan>' for j, line in enumerate(body))
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" role="img" aria-labelledby="title desc">
<title id="title">{escape(' '.join(title))}</title><desc id="desc">{escape(' '.join(body))}</desc>
<rect width="1080" height="1350" fill="#fffaf5"/>
<circle cx="1050" cy="80" r="220" fill="#ffe3d9"/>
<rect x="88" y="120" width="70" height="8" rx="4" fill="#ff3a2d"/>
<text x="88" y="205" font-family="Arial,sans-serif" font-size="28" font-weight="700" letter-spacing="2" fill="#a52520">{escape(eyebrow)}</text>
<text font-family="Arial,sans-serif" font-size="94" font-weight="700" letter-spacing="-3" fill="#191919">{title_svg}</text>
<text font-family="Arial,sans-serif" font-size="36" fill="#55504c">{body_svg}</text>
<rect x="88" y="965" width="904" height="132" rx="28" fill="#ff3a2d"/>
<text x="130" y="1045" font-family="Arial,sans-serif" font-size="34" font-weight="700" fill="white">{escape(footer)}</text>
<text x="88" y="1230" font-family="Arial,sans-serif" font-size="32" font-weight="700" fill="#191919">Mealsolved</text>
<text x="992" y="1230" text-anchor="end" font-family="Arial,sans-serif" font-size="26" fill="#77706a">{i} / 5</text>
</svg>'''
    (out / f'slide-{i:02}.svg').write_text(svg, encoding='utf-8')
print(f'Created {len(slides)} original 1080x1350 SVG slides in {out}')
