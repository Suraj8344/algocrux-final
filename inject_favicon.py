#!/usr/bin/env python3
"""
AlgoCrux Favicon Injector (PNG Version)
Adds favicon links to all HTML files.
Place your logo.png in an assets/ folder first.
Run this from your project root directory.
"""
import os, glob

# Favicon links for root-level files (index.html, login.html, etc.)
ROOT_FAVICON = """<link rel="icon" type="image/png" sizes="32x32" href="assets/logo.png">
<link rel="apple-touch-icon" sizes="180x180" href="assets/logo.png">"""

# Favicon links for files inside algorithms/ folder
ALGO_FAVICON = """<link rel="icon" type="image/png" sizes="32x32" href="../assets/logo.png">
<link rel="apple-touch-icon" sizes="180x180" href="../assets/logo.png">"""

def remove_old_favicons(content):
    """Remove any previously injected favicon links."""
    lines = content.split('\n')
    new_lines = []
    for line in lines:
        if 'rel="icon"' in line or 'rel="shortcut icon"' in line or 'rel="apple-touch-icon"' in line:
            continue
        new_lines.append(line)
    return '\n'.join(new_lines)

def inject_favicon(filepath, is_algorithm=False):
    """Inject favicon links into a single HTML file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if not filepath.endswith('.html'):
        return

    # Remove old favicons
    content = remove_old_favicons(content)

    # Choose correct path based on file location
    favicon_html = ALGO_FAVICON if is_algorithm else ROOT_FAVICON

    # Insert before </head>
    if '</head>' in content:
        content = content.replace('</head>', favicon_html + '\n</head>', 1)
    elif '<head>' in content:
        # If no </head>, insert after <head>
        content = content.replace('<head>', '<head>\n' + favicon_html, 1)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"  Updated: {os.path.basename(filepath)}")

def main():
    # Update root-level HTML files
    root_files = [
        'index.html', 'login.html', 'register.html', 
        'dashboard.html', 'preview.html'
    ]

    print("Updating root-level files...\n")
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
            print(f"\nUpdating algorithm files...\n")
            for fp in sorted(files):
                inject_favicon(fp, is_algorithm=True)
            print(f"\nDone! Updated {len(files)} algorithm files.")
        else:
            print(f"\nNo .html files found in {algo_dir}/")
    else:
        print(f"\nWarning: '{algo_dir}/' directory not found!")

    print("\n" + "="*50)
    print("IMPORTANT: Make sure this file exists:")
    print("  - assets/logo.png  (your AlgoCrux logo)")
    print("="*50)

if __name__ == '__main__':
    main()
