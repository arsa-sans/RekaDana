"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Hero3DPhone() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 560;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting — mengikuti palette Forest/Growth
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xeaf5f0, 1.6);
    dirLight.position.set(4, 7, 5);
    scene.add(dirLight);

    // Growth green point light — alasan: memberi karakter warna brand pada 3D model
    const pointGreen = new THREE.PointLight(0x35b88a, 4, 18);
    pointGreen.position.set(-2, -1, 3);
    scene.add(pointGreen);

    const pointRim = new THREE.PointLight(0x1a4d43, 2.5, 12);
    pointRim.position.set(3, 4, 2);
    scene.add(pointRim);

    // ─── Phone group ───
    const phoneGroup = new THREE.Group();
    scene.add(phoneGroup);

    const bodyW = 3.0;
    const bodyH = 6.2;
    const bodyD = 0.26;

    // Chassis — Forest green
    const chassisMat = new THREE.MeshPhongMaterial({
      color: 0x153d35,
      shininess: 100,
      specular: 0x35b88a,
    });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyD), chassisMat);
    phoneGroup.add(chassis);

    // Metallic rim
    const rimMat = new THREE.MeshPhongMaterial({
      color: 0x1a4d43,
      shininess: 140,
      specular: 0xd1e8df,
    });
    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW + 0.07, bodyH + 0.07, bodyD - 0.05),
      rimMat
    );
    phoneGroup.add(rim);

    // ─── Screen canvas: RekaDana UI ───
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 960;
    const ctx = canvas.getContext("2d")!;

    // Background gradient Forest → dark
    const bg = ctx.createLinearGradient(0, 0, 0, 960);
    bg.addColorStop(0, "#153D35");
    bg.addColorStop(0.35, "#0d2b25");
    bg.addColorStop(1, "#081a16");
    ctx.fillStyle = bg;
    ctx.roundRect(0, 0, 480, 960, 20);
    ctx.fill();

    // Status bar / notch
    ctx.fillStyle = "#0a1f1b";
    ctx.beginPath();
    ctx.roundRect(160, 16, 160, 32, 16);
    ctx.fill();

    // Header
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("RekaDana", 36, 100);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "13px sans-serif";
    ctx.fillText("Malam Seni OSIS 2026", 36, 122);

    // Summary card
    ctx.fillStyle = "rgba(53,184,138,0.14)";
    ctx.strokeStyle = "rgba(53,184,138,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(30, 148, 420, 170, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "14px sans-serif";
    ctx.fillText("Total Anggaran", 55, 185);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("Rp 15.000.000", 55, 225);

    ctx.fillStyle = "#35b88a";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("Rp 11.200.000 terserap", 55, 258);

    // Progress bar anggaran
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.roundRect(55, 275, 390, 8, 4);
    ctx.fill();
    ctx.fillStyle = "#35b88a";
    ctx.beginPath();
    ctx.roundRect(55, 275, 293, 8, 4);
    ctx.fill();

    // Expense rows
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.beginPath();
    ctx.roundRect(30, 345, 420, 260, 16);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("Pengeluaran Terkini", 52, 380);

    const rows = [
      { label: "Dekorasi Panggung", amt: "Rp 2.400.000", pct: 0.72, color: "#35b88a" },
      { label: "Kostum Penampil", amt: "Rp 1.800.000", pct: 0.55, color: "#2ea87d" },
      { label: "Sound System", amt: "Rp 3.000.000", pct: 0.90, color: "#1a7a5e" },
    ];

    rows.forEach((row, i) => {
      const y = 415 + i * 68;
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "13px sans-serif";
      ctx.fillText(row.label, 52, y);
      ctx.fillStyle = row.color;
      ctx.font = "bold 13px sans-serif";
      ctx.fillText(row.amt, 310, y);
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.roundRect(52, y + 10, 360, 7, 3.5);
      ctx.fill();
      ctx.fillStyle = row.color;
      ctx.beginPath();
      ctx.roundRect(52, y + 10, 360 * row.pct, 7, 3.5);
      ctx.fill();
    });

    // CTA button
    ctx.fillStyle = "#35b88a";
    ctx.beginPath();
    ctx.roundRect(44, 790, 392, 56, 12);
    ctx.fill();
    ctx.fillStyle = "#153D35";
    ctx.font = "bold 17px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("+ Ajukan Pengeluaran", 240, 825);
    ctx.textAlign = "left";

    // Status badge
    ctx.fillStyle = "#d1fae5";
    ctx.beginPath();
    ctx.roundRect(44, 862, 120, 28, 14);
    ctx.fill();
    ctx.fillStyle = "#065f46";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("● Disetujui (3)", 55, 881);

    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.roundRect(174, 862, 118, 28, 14);
    ctx.fill();
    ctx.fillStyle = "#92400e";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("⏳ Menunggu (1)", 184, 881);

    const screenTexture = new THREE.CanvasTexture(canvas);
    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(bodyW - 0.11, bodyH - 0.14),
      new THREE.MeshBasicMaterial({ map: screenTexture })
    );
    screenMesh.position.z = bodyD / 2 + 0.004;
    phoneGroup.add(screenMesh);

    // ─── Aura rings — alasan: kedalaman visual, bukan dekorasi acak ───
    const makeRing = (inner: number, outer: number, opacity: number, z = -0.5) => {
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(inner, outer, 64),
        new THREE.MeshBasicMaterial({
          color: 0x35b88a,
          transparent: true,
          opacity,
          side: THREE.DoubleSide,
        })
      );
      mesh.position.z = z;
      phoneGroup.add(mesh);
      return mesh;
    };
    const ring1 = makeRing(2.1, 3.4, 0.22, -0.5);
    const ring2 = makeRing(3.6, 4.6, 0.10, -0.9);

    // ─── Floating badge: status chip ───
    const badgeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.75, 0.07),
      new THREE.MeshPhongMaterial({ color: 0x1a4d43, shininess: 110, specular: 0xd1e8df })
    );
    badgeMesh.position.set(2.1, 1.7, 0.75);
    badgeMesh.rotation.y = -0.28;
    phoneGroup.add(badgeMesh);

    // Floating coin — alasan: menambah kedalaman 3D scene
    const coinMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.07, 32),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.15 })
    );
    coinMesh.position.set(-2.0, -1.5, 0.7);
    coinMesh.rotation.x = 1.1;
    coinMesh.rotation.z = 0.4;
    phoneGroup.add(coinMesh);

    // Initial pose
    phoneGroup.rotation.x = 0.10;
    phoneGroup.rotation.y = -0.35;
    phoneGroup.rotation.z = 0.05;

    // ─── Mouse parallax ───
    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    window.addEventListener("mousemove", onMouseMove);

    // ─── Animation loop ───
    // Gunakan performance.now() karena THREE.Clock deprecated di r187+
    let animId: number;
    const startTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = (performance.now() - startTime) / 1000;

      // Gentle levitation — alasan: reinforces 'floating' mobile product feel
      phoneGroup.position.y = Math.sin(t * 1.4) * 0.17;

      // Smooth mouse parallax
      phoneGroup.rotation.y += ((-0.35 + mouseX * 0.22) - phoneGroup.rotation.y) * 0.04;
      phoneGroup.rotation.x += ((0.10 - mouseY * 0.18) - phoneGroup.rotation.x) * 0.04;

      // Slow ring rotation — alasan: gives rings life without looping aggressively
      ring1.rotation.z = t * 0.08;
      ring2.rotation.z = -t * 0.05;

      // Badge & coin secondary motion
      badgeMesh.position.y = 1.7 + Math.sin(t * 2.1) * 0.07;
      coinMesh.rotation.y += 0.018;

      // Green glow pulse — subtle
      pointGreen.intensity = 3.5 + Math.sin(t * 2.2) * 0.8;

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" aria-hidden="true" />;
}
