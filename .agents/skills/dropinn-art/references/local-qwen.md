# Optional local draft route

Use only when local Qwen drafts are requested. The installed MS painter preset yields cruder pixel sprites than the built-in-generated concept references; it is not an interchangeable generator for the chosen production style.

On this machine, run noninteractively in PowerShell:

```powershell
Push-Location 'C:\AI-local-artist\Local-Pixel-Artist'
try {
  & '.\.venv\Scripts\python.exe' -u diffusion_artist.py 'a nervous sheep with a crooked bell' --engine qwen --style ms-painter --size 256x256 --colors 16
  if ($LASTEXITCODE -ne 0) { throw 'Local MS painter generation failed.' }
} finally {
  Pop-Location
}
```

Read the reported output directory under that app's `art/` folder. Inspect its `sprite.png`, preview, and generation metadata before copying a selected result into DropInn. The existing app needs its configured ComfyUI/model environment. If that path or service is missing, report it instead of installing a replacement automatically.

Do not use `MS painter.cmd` for unattended generation: it opens Paint/Explorer and pauses. Omit `--paint` and `--open` for agent work. Always supply a prompt to avoid interactive input. This exporter crops and centers sprites, so it is unsuitable for the game's aligned modular hero layers.

The installed Qwen weights have a research/evaluation license; inspect `C:\AI-local-artist\Local-Pixel-Artist\licenses\Qwen-Image-2.1.txt` before choosing them for commercial model use. The saved concept references and default built-in generation path are separate from these weights.
