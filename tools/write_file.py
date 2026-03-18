#!/usr/bin/env python3

import json
import os
import sys
from pathlib import Path

def main():
    try:
        data = json.load(sys.stdin)

        path = data["path"]
        contents = data["contents"]

        p = Path(path)

        # create directories if needed
        if p.parent:
            p.parent.mkdir(parents=True, exist_ok=True)

        # write file
        with open(p, "w", encoding="utf-8") as f:
            f.write(contents)

        json.dump(
            {
                "success": True,
                "path": str(p),
                "bytes_written": len(contents.encode("utf-8"))
            },
            sys.stdout
        )

    except Exception as e:
        json.dump(
            {
                "success": False,
                "error": str(e)
            },
            sys.stdout
        )
        sys.exit(1)

if __name__ == "__main__":
    main()

