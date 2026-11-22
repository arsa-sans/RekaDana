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
    ctx.fillText("OSIS SMK Nusantara 1", 36, 122);

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
    ctx.fillText("Total Anggaran Kegiatan", 55, 185);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("Rp 15.000.000", 55, 225);

    ctx.fillStyle = "#35b88a";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("Rp 10.600.000 teralokasi", 55, 258);

    // Progress bar anggaran
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.roundRect(55, 275, 390, 8, 4);
    ctx.fill();
    ctx.fillStyle = "#35b88a";
    ctx.beginPath();
    ctx.roundRect(55, 275, 275, 8, 4);
    ctx.fill();

    // Expense rows
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.beginPath();
    ctx.roundRect(30, 345, 420, 260, 16);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("Pos Anggaran Terencana", 52, 380);

    const rows = [
      { label: "Sewa Panggung & Tenda", amt: "Rp 4.500.000", pct: 0.75, color: "#35b88a" },
      { label: "Kostum Penampil", amt: "Rp 3.600.000", pct: 0.60, color: "#2ea87d" },
      { label: "Konsumsi Panitia & Tamu", amt: "Rp 2.500.000", pct: 0.42, color: "#1a7a5e" },
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

    // ─── Floating badge: status widget dengan Canvas texture resolusi tinggi ───
    // Alasan: menampilkan simulasi notifikasi persetujuan transaksi kas,
    // langsung mengisi ruang di samping HP dengan konten relevan (R-22).
    const badgeCanvas = document.createElement("canvas");
    badgeCanvas.width = 512;
    badgeCanvas.height = 256;
    const bCtx = badgeCanvas.getContext("2d")!;

    // Background card: emerald gelap berkelas
    bCtx.fillStyle = "#123830";
    bCtx.beginPath();
    bCtx.roundRect(4, 4, 504, 248, 28);
    bCtx.fill();

    // Subtle inner gradient
    const cardGrad = bCtx.createLinearGradient(0, 0, 0, 256);
    cardGrad.addColorStop(0, "rgba(53,184,138,0.22)");
    cardGrad.addColorStop(0.5, "rgba(21,61,53,0.1)");
    cardGrad.addColorStop(1, "rgba(0,0,0,0.3)");
    bCtx.fillStyle = cardGrad;
    bCtx.beginPath();
    bCtx.roundRect(4, 4, 504, 248, 28);
    bCtx.fill();

    // Border highlight Growth Green
    bCtx.strokeStyle = "rgba(53,184,138,0.75)";
    bCtx.lineWidth = 3;
    bCtx.beginPath();
    bCtx.roundRect(4, 4, 504, 248, 28);
    bCtx.stroke();

    // Top pill: Status disetujui
    bCtx.fillStyle = "rgba(53,184,138,0.22)";
    bCtx.beginPath();
    bCtx.roundRect(32, 28, 240, 38, 19);
    bCtx.fill();
    bCtx.strokeStyle = "rgba(53,184,138,0.5)";
    bCtx.lineWidth = 1.5;
    bCtx.beginPath();
    bCtx.roundRect(32, 28, 240, 38, 19);
    bCtx.stroke();

    // Live dot
    bCtx.fillStyle = "#35b88a";
    bCtx.beginPath();
    bCtx.arc(52, 47, 6, 0, Math.PI * 2);
    bCtx.fill();

    bCtx.fillStyle = "#d1fae5";
    bCtx.font = "bold 18px 'Plus Jakarta Sans', sans-serif";
    bCtx.fillText("Pengeluaran Disetujui", 68, 53);

    // Waktu
    bCtx.fillStyle = "rgba(255,255,255,0.5)";
    bCtx.font = "16px 'Plus Jakarta Sans', sans-serif";
    bCtx.textAlign = "right";
    bCtx.fillText("Baru saja", 476, 53);
    bCtx.textAlign = "left";

    // Divider tipis
    bCtx.fillStyle = "rgba(255,255,255,0.12)";
    bCtx.fillRect(32, 84, 448, 1.5);

    // Kategori & Nama Pengeluaran
    bCtx.fillStyle = "rgba(255,255,255,0.7)";
    bCtx.font = "18px 'Plus Jakarta Sans', sans-serif";
    bCtx.fillText("Sewa Panggung & Tenda", 32, 118);

    // Nilai Transaksi
    bCtx.fillStyle = "#ffffff";
    bCtx.font = "bold 44px 'Plus Jakarta Sans', sans-serif";
    bCtx.fillText("Rp 4.500.000", 32, 172);

    // Bottom info tag
    bCtx.fillStyle = "#35b88a";
    bCtx.font = "bold 18px 'Plus Jakarta Sans', sans-serif";
    bCtx.fillText("✓ Terverifikasi Bendahara", 32, 218);

    bCtx.fillStyle = "rgba(255,255,255,0.5)";
    bCtx.font = "16px 'Plus Jakarta Sans', sans-serif";
    bCtx.textAlign = "right";
    bCtx.fillText("Kas Kegiatan OSIS", 476, 218);
    bCtx.textAlign = "left";

    const badgeTexture = new THREE.CanvasTexture(badgeCanvas);
    const badgeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 0.95),
      new THREE.MeshBasicMaterial({ map: badgeTexture, transparent: true, side: THREE.DoubleSide })
    );
    badgeMesh.position.set(2.0, 1.35, 0.65);
    badgeMesh.rotation.y = -0.18;
    phoneGroup.add(badgeMesh);

    // ─── Floating coin group: Realistic Shiny Gold Coins with Rp ───
    // Alasan: representasi fisik dana/anggaran keuangan kegiatan sekolah (R-22)
    const coinGroup = new THREE.Group();
    coinGroup.position.set(-2.05, -1.35, 0.85);
    coinGroup.rotation.x = 0.85;
    coinGroup.rotation.z = 0.35;
    phoneGroup.add(coinGroup);

    // Koin material: emas mengkilap dengan emissive amber agar tidak hitam
    const coinMat = new THREE.MeshPhongMaterial({
      color: 0xf59e0b, // Amber emas kaya
      emissive: 0x8a4500, // Glow hangat agar selalu bercahaya
      emissiveIntensity: 0.45,
      shininess: 240,
      specular: 0xfff3c4,
    });

    // Koin utama (silinder)
    const mainCoin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.08, 48),
      coinMat
    );
    coinGroup.add(mainCoin);

    // Bevel rim luar timbul
    const rimTorus = new THREE.Mesh(
      new THREE.TorusGeometry(0.40, 0.025, 16, 48),
      coinMat
    );
    rimTorus.rotation.x = Math.PI / 2;
    coinGroup.add(rimTorus);

    // Face koin (Rp emblem)
    const faceCanvas = document.createElement("canvas");
    faceCanvas.width = 256;
    faceCanvas.height = 256;
    const fCtx = faceCanvas.getContext("2d")!;

    // Gradasi emas berkilau
    const fGrad = fCtx.createRadialGradient(128, 110, 20, 128, 128, 128);
    fGrad.addColorStop(0, "#ffe57f");
    fGrad.addColorStop(0.35, "#f59e0b");
    fGrad.addColorStop(0.8, "#d97706");
    fGrad.addColorStop(1, "#92400e");
    fCtx.fillStyle = fGrad;
    fCtx.beginPath();
    fCtx.arc(128, 128, 124, 0, Math.PI * 2);
    fCtx.fill();

    // Border cincin dalam timbul
    fCtx.strokeStyle = "rgba(255, 240, 170, 0.85)";
    fCtx.lineWidth = 6;
    fCtx.beginPath();
    fCtx.arc(128, 128, 102, 0, Math.PI * 2);
    fCtx.stroke();

    // Teks Rp emas dengan shadow timbul
    fCtx.shadowColor = "rgba(100, 45, 0, 0.6)";
    fCtx.shadowBlur = 6;
    fCtx.shadowOffsetX = 2;
    fCtx.shadowOffsetY = 3;
    fCtx.fillStyle = "#ffffff";
    fCtx.font = "bold 82px 'Plus Jakarta Sans', sans-serif";
    fCtx.textAlign = "center";
    fCtx.textBaseline = "middle";
    fCtx.fillText("Rp", 128, 126);

    const faceTexture = new THREE.CanvasTexture(faceCanvas);

    // Face atas (+Y)
    const faceTop = new THREE.Mesh(
      new THREE.CircleGeometry(0.39, 48),
      new THREE.MeshBasicMaterial({ map: faceTexture })
    );
    faceTop.rotation.x = -Math.PI / 2;
    faceTop.position.y = 0.042;
    coinGroup.add(faceTop);

    // Face bawah (-Y)
    const faceBottom = new THREE.Mesh(
      new THREE.CircleGeometry(0.39, 48),
      new THREE.MeshBasicMaterial({ map: faceTexture })
    );
    faceBottom.rotation.x = Math.PI / 2;
    faceBottom.position.y = -0.042;
    coinGroup.add(faceBottom);

    // Koin pendukung kedua di belakang (kesan tumpukan koin)
    const coin2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.07, 36),
      coinMat
    );
    coin2.position.set(-0.25, -0.14, -0.18);
    coin2.rotation.z = 0.22;
    coinGroup.add(coin2);

    // Cahaya hangat point light khusus koin
    const coinLight = new THREE.PointLight(0xffbe3b, 5, 8);
    coinLight.position.set(-2.0, -0.9, 2.2);
    scene.add(coinLight);

    // Initial pose — lurus ke depan (y=0), sedikit miring X ke bawah (0.04)
    phoneGroup.rotation.x = 0.04;
    phoneGroup.rotation.y = 0;
    phoneGroup.rotation.z = 0;

    // ─── Mouse parallax ───
    // Ambil posisi mouse relatif terhadap viewport penuh
    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("mousemove", onMouseMove);

    // ─── Animation loop ───
    // Gunakan performance.now() karena THREE.Clock deprecated di r187+
    let animId: number;
    const startTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = (performance.now() - startTime) / 1000;

      // Mouse parallax yang responsif dan terkontrol:
      // HP lurus ke depan saat kursor di tengah, dan mengikuti kursor secara halus saat bergerak
      const targetRotY = mouseX * 0.22; // ~12.5° maks
      const targetRotX = 0.04 - mouseY * 0.16; // ~9° maks
      phoneGroup.rotation.y += (targetRotY - phoneGroup.rotation.y) * 0.045;
      phoneGroup.rotation.x += (targetRotX - phoneGroup.rotation.x) * 0.045;

      // Sedikit translasi posisi mengikuti kursor untuk kedalaman 3D nyata
      const targetPosX = mouseX * 0.26;
      const targetPosY = Math.sin(t * 1.4) * 0.12 - mouseY * 0.18;
      phoneGroup.position.x += (targetPosX - phoneGroup.position.x) * 0.045;
      phoneGroup.position.y += (targetPosY - phoneGroup.position.y) * 0.045;

      // Slow ring rotation
      ring1.rotation.z = t * 0.08;
      ring2.rotation.z = -t * 0.05;

      // Badge & coin secondary motion
      badgeMesh.position.y = 1.35 + Math.sin(t * 2.1) * 0.06;
      coinGroup.rotation.y += 0.02;
      coinGroup.position.y = -1.35 + Math.sin(t * 1.8) * 0.08;

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
