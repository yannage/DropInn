import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  label: string;
  glyph: string;
  topColor: string;
  edgeColor: string;
  glowColor: string;
  size?: number;
  isActive?: boolean;
}

const buildFaceTexture = (label: string, glyph: string, color: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(180, 160, 20, 256, 256, 250);
  gradient.addColorStop(0, '#fff1c8');
  gradient.addColorStop(0.5, color);
  gradient.addColorStop(1, '#241509');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,236,193,0.95)';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(256, 256, 190, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(88,50,19,0.7)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(256, 256, 150, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(33,19,8,0.95)';
  ctx.font = '700 138px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, 256, 230);

  ctx.fillStyle = 'rgba(33,19,8,0.82)';
  ctx.font = '600 42px Inter, sans-serif';
  ctx.fillText(label.toUpperCase(), 256, 338);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
};

export const ActionChip3D = ({
  label,
  glyph,
  topColor,
  edgeColor,
  glowColor,
  size = 84,
  isActive = true,
}: Props) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = size;
    const height = size;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 4.7);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 1.9);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xfff3cf, 1.6);
    key.position.set(-2, 3, 4);
    scene.add(key);

    const rim = new THREE.DirectionalLight(new THREE.Color(glowColor), 1.2);
    rim.position.set(3, -1, 3);
    scene.add(rim);

    const chip = new THREE.Group();
    chip.rotation.x = Math.PI / 2 - 0.18;
    scene.add(chip);

    const topTexture = buildFaceTexture(label, glyph, topColor);
    const faceMaterial = new THREE.MeshStandardMaterial({
      map: topTexture ?? undefined,
      metalness: 0.18,
      roughness: 0.48,
      color: '#ffffff',
    });
    const sideMaterial = new THREE.MeshStandardMaterial({
      color: edgeColor,
      metalness: 0.4,
      roughness: 0.62,
    });

    const geometry = new THREE.CylinderGeometry(1.32, 1.32, 0.44, 64, 1, false);
    const puck = new THREE.Mesh(geometry, [sideMaterial, faceMaterial, faceMaterial]);
    chip.add(puck);

    const rimGeometry = new THREE.TorusGeometry(1.16, 0.09, 18, 72);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: '#f9e3a0',
      metalness: 0.76,
      roughness: 0.28,
      emissive: new THREE.Color(glowColor),
      emissiveIntensity: isActive ? 0.25 : 0.08,
    });
    const rimMesh = new THREE.Mesh(rimGeometry, rimMaterial);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = 0.23;
    chip.add(rimMesh);

    const backRim = rimMesh.clone();
    backRim.position.y = -0.23;
    chip.add(backRim);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.45, 48),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0.1, -0.45, 0.16);
    scene.add(shadow);

    let raf = 0;
    const animate = () => {
      raf = window.requestAnimationFrame(animate);
      chip.rotation.z += isActive ? 0.018 : 0.006;
      chip.position.y = isActive ? Math.sin(performance.now() / 450) * 0.04 : 0;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(raf);
      geometry.dispose();
      rimGeometry.dispose();
      shadow.geometry.dispose();
      faceMaterial.dispose();
      sideMaterial.dispose();
      rimMaterial.dispose();
      shadow.material.dispose();
      topTexture?.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [edgeColor, glowColor, glyph, isActive, label, size, topColor]);

  return <div ref={mountRef} style={{ width: size, height: size }} />;
};
