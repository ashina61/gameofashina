import type Phaser from 'phaser';
import { PALETTE, SHADOW_ALPHA } from './ArtStyle';
import { shade } from './BuildingArt';
import type { WorkerState } from '@/types';

/**
 * Isci figuru - sehirdeki tek hareketli varlik.
 *
 * ArtStyle sozlesmesine uyar: isik sol ustten, golge saga-asagi, kontur yok,
 * detay dusuk. Bina gorsel sistemine DOKUNMAZ; ayri bir dosyada durur ve
 * kendi dokularini pisirir (Sprint 7B'de dondurulan bina sistemi degismedi).
 *
 * UC DURUM GORSEL OLARAK AYRILIR
 *   idle    : gri-bej tunik, eli bos, hafif kambur - sehirde bosta duruyor
 *   moving  : kirmizi tunik, bacaklar ayrik (yuruyus durusu) - yolda
 *   working : kirmizi tunik + omuzda alet + sari bant - is basinda
 *
 * Bu ayrim YALNIZCA renge dayanmaz; siluet de degisir, cunku telefonda
 * uzaklastirilmis kamerada renk farki tek basina okunmuyor.
 */

/** Figurun dokudaki olcusu (mantiksal piksel). */
export const WORKER_WIDTH = 18;
export const WORKER_HEIGHT = 30;

/** Ayagin dokudaki dikey orijini; sprite bu noktadan zemine oturur. */
export const WORKER_ORIGIN_Y = (WORKER_HEIGHT - 2) / WORKER_HEIGHT;

/** Durumlara gore tunik rengi. */
const TUNIC: Record<WorkerState, number> = {
  idle: PALETTE.clothCool,
  moving: PALETTE.clothWarm,
  working: PALETTE.clothWarm,
};

/** Ten rengi - tek ton, detay yok. */
const SKIN = 0xd9a877;

/**
 * Bosta iscinin solgunlugu doku uzerinde DEGIL, sahne tarafinda alfa ile
 * verilir; dokuya yari saydam bir dikdortgen basmak seffaf alani da
 * boyayip figuru gri bir kutuya cevirirdi.
 */
export const IDLE_ALPHA = 0.7;

/**
 * Bir isci figurunu cizer.
 *
 * Koordinatlar dokunun sol ust kosesine goredir; figur yatayda ortalanir ve
 * dikeyde dokunun alt kenarina oturur.
 */
export function drawWorker(g: Phaser.GameObjects.Graphics, state: WorkerState): void {
  const w = WORKER_WIDTH;
  const h = WORKER_HEIGHT;
  const cx = w / 2;
  const baseY = h - 2;

  // Zemine temas golgesi - butun sehirde ayni yon.
  g.fillStyle(0x1a1206, SHADOW_ALPHA);
  g.fillEllipse(cx + 1, baseY + 1, w * 0.62, h * 0.12);

  const tunic = TUNIC[state];
  const idle = state === 'idle';
  // Bosta duran isci hafif kamburdur; siluet farki renkten once okunur.
  const headY = idle ? h * 0.30 : h * 0.24;
  const shoulderY = headY + h * 0.14;
  const hipY = baseY - h * 0.26;

  // Bacaklar. Yoldaki isci adim atar (ayrik), digerleri bitisik durur.
  g.fillStyle(shade(PALETTE.woodDark, 0.1), 1);
  if (state === 'moving') {
    g.fillRect(cx - w * 0.30, hipY, w * 0.18, baseY - hipY);
    g.fillRect(cx + w * 0.12, hipY, w * 0.18, baseY - hipY);
  } else {
    g.fillRect(cx - w * 0.20, hipY, w * 0.17, baseY - hipY);
    g.fillRect(cx + w * 0.03, hipY, w * 0.17, baseY - hipY);
  }

  // Tunik - omuzdan kalcaya genisleyen yamuk. Sag yuz bir ton koyu.
  g.fillStyle(tunic, 1);
  g.beginPath();
  g.moveTo(cx - w * 0.26, shoulderY);
  g.lineTo(cx + w * 0.26, shoulderY);
  g.lineTo(cx + w * 0.32, hipY + 1);
  g.lineTo(cx - w * 0.32, hipY + 1);
  g.closePath();
  g.fillPath();

  g.fillStyle(shade(tunic, -0.22), 1);
  g.beginPath();
  g.moveTo(cx, shoulderY);
  g.lineTo(cx + w * 0.26, shoulderY);
  g.lineTo(cx + w * 0.32, hipY + 1);
  g.lineTo(cx, hipY + 1);
  g.closePath();
  g.fillPath();

  // Calisan iscinin belinde sari bant - is basinda oldugunu yakindan da anlatir.
  if (state === 'working') {
    g.fillStyle(PALETTE.gold, 1);
    g.fillRect(cx - w * 0.30, hipY - h * 0.07, w * 0.60, h * 0.05);
  }

  // Kollar.
  g.fillStyle(shade(SKIN, -0.08), 1);
  if (state === 'working') {
    // Alet tutan kol yukari kalkar; siluetteki en belirgin fark budur.
    g.fillRect(cx - w * 0.40, shoulderY - h * 0.02, w * 0.16, h * 0.20);
    g.fillRect(cx + w * 0.24, shoulderY - h * 0.10, w * 0.16, h * 0.18);
  } else if (state === 'moving') {
    g.fillRect(cx - w * 0.40, shoulderY + h * 0.02, w * 0.14, h * 0.18);
    g.fillRect(cx + w * 0.26, shoulderY - h * 0.01, w * 0.14, h * 0.18);
  } else {
    g.fillRect(cx - w * 0.38, shoulderY + h * 0.03, w * 0.14, h * 0.19);
    g.fillRect(cx + w * 0.24, shoulderY + h * 0.03, w * 0.14, h * 0.19);
  }

  /*
   * Alet: govdenin SAGINDA duran dik sap ve tepesindeki demir.
   *
   * Ilk denemede sap omuzdan capraz iniyordu ve demir ucu tam basin
   * hizasina denk geliyordu - yakin cekimde alet degil GENIS KENARLI SAPKA
   * gibi okunuyordu (ekran goruntusunde gorulduu). Aleti govdeden ayirmak
   * siluetteki karisikligi kaldirdi.
   */
  if (state === 'working') {
    g.fillStyle(PALETTE.wood, 1);
    g.fillRect(cx + w * 0.40, headY - w * 0.16, w * 0.10, baseY - headY + w * 0.16);
    g.fillStyle(PALETTE.blockLight, 1);
    g.fillRect(cx + w * 0.26, headY - w * 0.26, w * 0.38, h * 0.055);
    g.fillStyle(shade(PALETTE.blockLight, -0.25), 1);
    g.fillRect(cx + w * 0.26, headY - w * 0.26 + h * 0.055, w * 0.38, h * 0.02);
  }

  // Bas ve sac.
  g.fillStyle(SKIN, 1);
  g.fillCircle(cx, headY, w * 0.20);
  g.fillStyle(shade(PALETTE.woodDark, -0.1), 1);
  g.fillEllipse(cx, headY - w * 0.10, w * 0.42, w * 0.20);
}
