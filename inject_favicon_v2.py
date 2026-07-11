#!/usr/bin/env python3
"""
AlgoCrux Favicon Injector v2
Removes old favicon code and injects new resized favicon links.
Run this from your project root directory.
"""
import os, glob, re

# Favicon links for root-level files
ROOT_FAVICON = """<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
<link rel="icon" type="image/png" sizes="64x64" href="assets/favicon-64.png">
<link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch.png">"""

# Favicon links for files inside algorithms/ folder
ALGO_FAVICON = """<link rel="icon" type="image/png" sizes="32x32" href="../assets/favicon-32.png">
<link rel="icon" type="image/png" sizes="64x64" href="../assets/favicon-64.png">
<link rel="apple-touch-icon" sizes="180x180" href="../assets/apple-touch.png">"""

def remove_old_favicons(content):
    """Remove ALL previously injected favicon code - CSS, HTML, and links."""

    # Remove old favicon link tags (various formats)
    patterns = [
        r'<link rel="icon"[^>]*>',
        r'<link rel="shortcut icon"[^>]*>',
        r'<link rel="alternate icon"[^>]*>',
        r'<link rel="apple-touch-icon"[^>]*>',
    ]
    for pattern in patterns:
        content = re.sub(pattern, '', content, flags=re.IGNORECASE)

    # Remove old favicon CSS blocks
    while '<!-- ===== FAVICON CSS ===== -->' in content:
        start = content.find('<!-- ===== FAVICON CSS ===== -->')
        end = content.find('</style>', start)
        if end != -1:
            end += len('</style>')
            content = content[:start] + content[end:]
        else:
            break

    # Remove old favicon HTML blocks
    while '<!-- ===== FAVICON HTML ===== -->' in content:
        start = content.find('<!-- ===== FAVICON HTML ===== -->')
        end = content.find('</div>', start)
        if end != -1:
            # Find the correct closing div by counting
            div_start = content.find('<div', start)
            if div_start != -1:
                pos = div_start + 4
                depth = 1
                while depth > 0 and pos < len(content):
                    next_open = content.find('<div', pos)
                    next_close = content.find('</div>', pos)
                    if next_close == -1:
                        break
                    if next_open != -1 and next_open < next_close:
                        depth += 1
                        pos = next_open + 4
                    else:
                        depth -= 1
                        pos = next_close + 6
                if depth == 0:
                    content = content[:start] + content[pos:]
            else:
                break
        else:
            break

    # Remove old favicon JS blocks
    while '<!-- ===== FAVICON JS ===== -->' in content:
        start = content.find('<!-- ===== FAVICON JS ===== -->')
        end = content.find('</script>', start)
        if end != -1:
            end += len('</script>')
            content = content[:start] + content[end:]
        else:
            break

    # Clean up extra blank lines left behind
    content = re.sub(r'\n{3,}', '\n\n', content)

    return content

def inject_favicon(filepath, is_algorithm=False):
    """Inject favicon links into a single HTML file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if not filepath.endswith('.html'):
        return

    # Remove ALL old favicon code
    content = remove_old_favicons(content)

    # Choose correct path based on file location
    favicon_html = ALGO_FAVICON if is_algorithm else ROOT_FAVICON

    # Insert before </head>
    if '</head>' in content:
        content = content.replace('</head>', favicon_html + '\n</head>', 1)
    elif '<head>' in content:
        content = content.replace('<head>', '<head>\n' + favicon_html, 1)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"  Updated: {os.path.basename(filepath)}")

def main():
    print(f"Running from: {os.getcwd()}")
    print(f"Files in current dir: {os.listdir('.')}")
    print()

    # Update root-level HTML files
    root_files = [
        'index.html', 'login.html', 'register.html', 
        'dashboard.html', 'preview.html'
    ]

    print("Cleaning old favicons and injecting new ones...\n")
    print("Root-level files:")
    for filename in root_files:
        if os.path.exists(filename):
            inject_favicon(filename, is_algorithm=False)
        else:
            print(f"  Skipped (not found): {filename}")

    # Update algorithm files
    algo_dir = 'algorithms'
    if os.path.exists(algo_dir):
        files = glob.glob(os.path.join(algo_dir, '*.html'))
        if files:
            print(f"\nAlgorithm files:")
            for fp in sorted(files):
                inject_favicon(fp, is_algorithm=True)
            print(f"\nDone! Updated {len(files)} algorithm files.")
        else:
            print(f"\nNo .html files found in {algo_dir}/")
    else:
        print(f"\nWarning: '{algo_dir}/' directory not found!")

    print("\n" + "="*60)
    print("IMPORTANT: Make sure these files exist in assets/:")
    print("  - assets/favicon-32.png   (32x32 browser favicon)")
    print("  - assets/favicon-64.png   (64x64 retina favicon)")
    print("  - assets/apple-touch.png  (180x180 mobile icon)")
    print("="*60)
    print("\nThen: git add . && git commit -m 'Update favicon'")

if __name__ == '__main__':
    main()
