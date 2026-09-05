#!/usr/bin/env python3
"""Split the design document into one file per screen.

`v3-dark.html` is ~120KB of inline-styled markup for 17 screens. Working from
one screen at a time is far easier than grepping the whole document, so this
writes `design/screens/<id>.html`. Output is gitignored -- it is derived, and
committing it would duplicate the source verbatim.

    python3 design/split-screens.py
"""
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(ROOT, 'src', 'v3-dark.html')
OUT = os.path.join(ROOT, 'screens')


def main() -> None:
    html = open(SOURCE).read()
    os.makedirs(OUT, exist_ok=True)

    marks = [(m.group(1), m.start()) for m in re.finditer(r'<div class="opt" id="([^"]+)">', html)]
    marks.append(('__end__', len(html)))

    for (screen_id, start), (_, end) in zip(marks, marks[1:]):
        with open(os.path.join(OUT, f'{screen_id}.html'), 'w') as f:
            f.write(html[start:end])
        print(f'{screen_id}')


if __name__ == '__main__':
    main()
