"""Normalize local chapter uploads without executing embedded content."""
import io, json, os, re, sys, zipfile, subprocess
from pathlib import Path
from PIL import Image, ImageOps
import pypdfium2

Image.MAX_IMAGE_PIXELS = 80_000_000
SUPPORTED = {'.jpg', '.jpeg', '.png', '.webp', '.pdf'}
MAX_PANELS = 180

def prepare(folder):
    root = Path(folder).resolve()
    manifest = json.loads((root / 'sources.json').read_text(encoding='utf-8'))
    output = root / 'panels'; output.mkdir(exist_ok=True)
    panels = []
    def save(image, source):
        if image.width * image.height > 80_000_000: raise ValueError('Gambar terlalu besar.')
        image = ImageOps.exif_transpose(image).convert('RGB')
        if image.width > 1440: image = image.resize((1440, round(image.height * 1440 / image.width)))
        height = round(image.width * 1.7)
        tops = [0] if image.height <= height * 1.3 else range(0, image.height, max(1, height - 120))
        for top in tops:
            if len(panels) >= MAX_PANELS: raise ValueError('Chapter melebihi 180 potongan; pecah bahan menjadi chapter lebih kecil.')
            crop = image.crop((0, top, image.width, min(image.height, top + height))) if len(tops) > 1 else image
            name = f'panel-{len(panels)+1:03d}.jpg'
            crop.save(output / name, quality=94)
            panels.append({'id': name, 'source': source, 'offsetY': top, 'width': crop.width, 'height': crop.height})
    def read(data, name):
        ext = Path(name).suffix.lower()
        if ext == '.pdf':
            pdf = pypdfium2.PdfDocument(data)
            try:
                if len(pdf) > 100: raise ValueError('PDF melebihi 100 halaman.')
                for n in range(len(pdf)):
                    page = pdf[n]
                    try:
                        scale = min(2,1440/max(1,page.get_width()))
                        if page.get_width()*page.get_height()*scale*scale > 80_000_000: raise ValueError('Halaman PDF terlalu besar.')
                        bitmap = page.render(scale=scale)
                        try: save(bitmap.to_pil(), f'{name} halaman {n+1}')
                        finally: bitmap.close()
                    finally: page.close()
            finally: pdf.close()
        elif ext in SUPPORTED:
            with Image.open(io.BytesIO(data)) as image: save(image, name)
        else: raise ValueError('Jenis bahan chapter tidak didukung.')
    for item in manifest['files']:
        source = root / 'raw' / item['stored']
        if source.suffix.lower() == '.zip':
            with zipfile.ZipFile(source) as archive:
                entries = [v for v in archive.infolist() if not v.is_dir()]
                if len(entries) > 100 or sum(v.file_size for v in entries) > 200_000_000: raise ValueError('ZIP terlalu besar setelah dibuka.')
                for entry in entries:
                    parts = Path(entry.filename.replace('\\','/')).parts
                    if '..' in parts or entry.filename.startswith(('/', '\\')) or ':' in entry.filename or (entry.external_attr >> 16) & 0o170000 == 0o120000: raise ValueError('Path ZIP tidak aman.')
                    if entry.flag_bits & 1: raise ValueError('ZIP berpassword tidak didukung.')
                    if Path(entry.filename).suffix.lower() not in SUPPORTED: raise ValueError('ZIP hanya boleh berisi gambar atau PDF chapter.')
                natural = lambda v: [int(x) if x.isdigit() else x.lower() for x in re.split(r'(\d+)',v.filename)]
                for entry in sorted(entries,key=natural): read(archive.read(entry),entry.filename)
        else: read(source.read_bytes(),item['name'])
    if not panels: raise ValueError('Tidak ditemukan panel chapter.')
    voice = manifest.get('voice')
    audio_duration = 0
    if voice:
        sys.path.insert(0,str(Path(__file__).resolve().parents[2] / 'app-data/tools/media'))
        import imageio_ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        subprocess.run([ffmpeg,'-v','error','-i',str(root/'raw'/voice['stored']),'-t','300','-ac','1','-ar','44100','-y',str(output/'voiceover.wav')],check=True,capture_output=True)
        import wave
        with wave.open(str(output/'voiceover.wav')) as wav: audio_duration = wav.getnframes()/wav.getframerate()
        if audio_duration > 180: raise ValueError('VO melebihi batas produksi awal 180 detik.')
    result = {'panels':panels,'audioDuration':audio_duration,'overlapNotice':'Potongan gambar panjang beririsan 120px; jangan mengulang narasi pada bagian overlap.'}
    (root/'panels.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    return result

if __name__ == '__main__':
    try: print(json.dumps(prepare(sys.argv[1]),ensure_ascii=False))
    except Exception as error: print(str(error),file=sys.stderr);sys.exit(1)
