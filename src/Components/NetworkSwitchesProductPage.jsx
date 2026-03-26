import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import hero from '../assets/hero.jpg';

const networkSwitchProducts = [
  // Unmanaged Switches - Un Managed Non POE
  {
    id: 1,
    model: 'DUS-5G',
    category: 'Unmanaged Switches',
    segment: 'Un Managed Non POE',
    description: 'Gigabit unmanaged Non PoE network switch.',
    imageUrl: hero,
    features: ['5*10M/100M/1000M RJ45 port', 'Plug and Play', 'Fanless and silent']
  },
  {
    id: 2,
    model: 'DUS-5G-25',
    category: 'Unmanaged Switches',
    segment: 'Un Managed Non POE',
    description: 'Multi Gigabit unmanaged Non PoE network switch.',
    imageUrl: hero,
    features: ['5*10M/100M/1000M/2.5G RJ45 port', 'Plug and Play', 'Fanless and silent']
  },
  {
    id: 3,
    model: 'DUS-8G',
    category: 'Unmanaged Switches',
    segment: 'Un Managed Non POE',
    description: 'Gigabit unmanaged Non PoE network switch.',
    imageUrl: hero,
    features: ['8*10M/100M/1000M RJ45 port', 'Plug and Play', 'Desktop or wall-mount']
  },
  {
    id: 4,
    model: 'DUS-8G-25',
    category: 'Unmanaged Switches',
    segment: 'Un Managed Non POE',
    description: 'Multi Gigabit unmanaged Non PoE network switch.',
    imageUrl: hero,
    features: ['8*10M/100M/1000M/2.5G RJ45 port', 'Energy Efficient Ethernet', 'Desktop or wall-mount']
  },
  {
    id: 5,
    model: 'DUS-8G-2F',
    category: 'Unmanaged Switches',
    segment: 'Un Managed Non POE',
    description: 'Gigabit unmanaged Non PoE network switch.',
    imageUrl: hero,
    features: ['8*10M/100M/1000M RJ45 port', '2*1G SFP Ports', 'Energy Efficient Ethernet']
  },
  {
    id: 6,
    model: 'DUS-16G',
    category: 'Unmanaged Switches',
    segment: 'Un Managed Non POE',
    description: 'Gigabit unmanaged Non PoE network switch.',
    imageUrl: hero,
    features: ['16*10M/100M/1000M RJ45 port', 'Energy Efficient Ethernet', 'Fanless and silent']
  },
  {
    id: 7,
    model: 'DUS-24G',
    category: 'Unmanaged Switches',
    segment: 'Un Managed Non POE',
    description: 'Gigabit unmanaged Non PoE network switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', 'Energy Efficient Ethernet', 'Desktop or wall-mount']
  },
  {
    id: 8,
    model: 'DUS-24G-2G-2F',
    category: 'Unmanaged Switches',
    segment: 'Un Managed Non POE',
    description: 'Gigabit unmanaged Non PoE network switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '2* 1G RJ-45 and 2*1G SFP Ports', 'Desktop or Rackmount']
  },

  // Web Smart Switches - Web Smart POE
  {
    id: 9,
    model: 'DSMS-4GP25-2XF',
    category: 'Web Smart Switches',
    segment: 'Web Smart POE',
    description: 'Web Smart managed PoE Switch.',
    imageUrl: hero,
    features: ['4*10M/100M/1000M/2.5G RJ45 port PoE', '2*10G SFP UPLINK', 'Total PoE budget 65 watt']
  },
  {
    id: 10,
    model: 'DSMS-8GP-2F',
    category: 'Web Smart Switches',
    segment: 'Web Smart POE',
    description: 'Web Smart managed PoE Switch.',
    imageUrl: hero,
    features: ['8*10M/100M/1000M RJ45 port PoE', '2*100/1000Mbps SFP UPLINK', 'Total PoE budget 150 watt']
  },
  {
    id: 11,
    model: 'DSMS-8GP25-1XF',
    category: 'Web Smart Switches',
    segment: 'Web Smart POE',
    description: 'Web Smart managed PoE Switch.',
    imageUrl: hero,
    features: ['8*10M/100M/1000M/2.5G RJ45 port PoE', '1*10G SFP UPLINK', 'Total PoE budget 120 watt']
  },
  {
    id: 12,
    model: 'DSMS-8GP25-2XF',
    category: 'Web Smart Switches',
    segment: 'Web Smart POE',
    description: 'Web Smart managed PoE Switch.',
    imageUrl: hero,
    features: ['8*10M/100M/1000M/2.5G RJ45 port PoE', '2*10G SFP UPLINK', 'Total PoE budget 120 watt']
  },
  {
    id: 13,
    model: 'DSMS-8XGP',
    category: 'Web Smart Switches',
    segment: 'Web Smart POE',
    description: 'Web Smart managed PoE Switch.',
    imageUrl: hero,
    features: ['8*10M/100M/1000M/2.5G/10G RJ45 port PoE', 'Layer 2 Multigig PoE', 'Total PoE budget 150 watt']
  },
  {
    id: 14,
    model: 'DSMS-16GP-2F',
    category: 'Web Smart Switches',
    segment: 'Web Smart POE',
    description: 'Web Smart managed PoE Switch.',
    imageUrl: hero,
    features: ['16*10M/100M/1000M RJ45 port PoE', '2*100/1000Mbps SFP UPLINK', 'Total PoE budget 300 watt']
  },
  {
    id: 15,
    model: 'DSMS-24GP-2G-2F',
    category: 'Web Smart Switches',
    segment: 'Web Smart POE',
    description: 'Web Smart managed PoE Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port PoE', '2*100/1000Mbps RJ-45 and 2*100/1000Mbps SFP UPLINK', 'Total PoE budget 400 watt']
  },
  {
    id: 16,
    model: 'DSMS-24GP-4F',
    category: 'Web Smart Switches',
    segment: 'Web Smart POE',
    description: 'Web Smart managed PoE Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port PoE', '4*100/1000Mbps SFP UPLINK', 'Total PoE budget 400 watt']
  },
  {
    id: 17,
    model: 'DSMS-24GPP-4XF',
    category: 'Web Smart Switches',
    segment: 'Web Smart POE',
    description: 'Web Smart managed PoE Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port PoE', '4*10G SFP UPLINK', 'Total PoE budget 400 watt']
  },
  {
    id: 18,
    model: 'DSMS-48GPP-4XF',
    category: 'Web Smart Switches',
    segment: 'Web Smart POE',
    description: 'Web Smart managed PoE Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ45 port PoE', '4*10G SFP UPLINK', 'Total PoE budget 800 watt']
  },

  // Web Smart Switches - Web Smart Non POE
  {
    id: 19,
    model: 'DSMS-8G-2F',
    category: 'Web Smart Switches',
    segment: 'Web Smart Non POE',
    description: 'Web Smart managed Non PoE Switch.',
    imageUrl: hero,
    features: ['8*10M/100M/1000M RJ45 port', '2*100/1000Mbps SFP UPLINK', 'Energy Efficient Ethernet']
  },
  {
    id: 20,
    model: 'DSMS-8XG',
    category: 'Web Smart Switches',
    segment: 'Web Smart Non POE',
    description: 'Web Smart managed Non PoE Switch.',
    imageUrl: hero,
    features: ['8*10M/100M/1000M/10G RJ45 port', 'Layer 2 Web-based management', 'Multigigabit LAN']
  },
  {
    id: 21,
    model: 'DSMS-16G-2F',
    category: 'Web Smart Switches',
    segment: 'Web Smart Non POE',
    description: 'Web Smart managed Non PoE Switch.',
    imageUrl: hero,
    features: ['16*10M/100M/1000M RJ45 port', '2*100/1000Mbps SFP UPLINK', 'Energy Efficient Ethernet']
  },
  {
    id: 22,
    model: 'DSMS-24G-2G-2F',
    category: 'Web Smart Switches',
    segment: 'Web Smart Non POE',
    description: 'Web Smart managed Non PoE Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '2*100/1000Mbps RJ-45 and 2*100/1000Mbps SFP UPLINK', 'Rack mountable']
  },
  {
    id: 23,
    model: 'DSMS-24G-4F',
    category: 'Web Smart Switches',
    segment: 'Web Smart Non POE',
    description: 'Web Smart managed Non PoE Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '4*100/1000Mbps SFP UPLINK', 'Rack mountable']
  },
  {
    id: 24,
    model: 'DSMS-24G-4XF',
    category: 'Web Smart Switches',
    segment: 'Web Smart Non POE',
    description: 'Web Smart managed Non PoE Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Rack mountable']
  },
  {
    id: 25,
    model: 'DSMS-48G-4XF',
    category: 'Web Smart Switches',
    segment: 'Web Smart Non POE',
    description: 'Web Smart managed Non PoE Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Rack mountable']
  },

  // Fully Managed Switches - Managed POE
  {
    id: 26,
    model: 'DMS-8GP-2F',
    category: 'Fully Managed Switches',
    segment: 'Managed POE',
    description: 'Layer 2 managed PoE Switch.',
    imageUrl: hero,
    features: ['8*10M/100M/1000M RJ45 port PoE', '2*100M/1G SFP UPLINK', 'Total PoE budget 150 watt']
  },
  {
    id: 27,
    model: 'DMS-8GPP-4C-2BT',
    category: 'Fully Managed Switches',
    segment: 'Managed POE',
    description: 'Layer 2 managed PoE Switch.',
    imageUrl: hero,
    features: ['8*10M/100M/1000M RJ45 port PoE', '4*100M/1G combo (SFP/RJ-45) UPLINK', 'Total PoE budget 300 watt']
  },
  {
    id: 28,
    model: 'DMS-16GP-2F',
    category: 'Fully Managed Switches',
    segment: 'Managed POE',
    description: 'Layer 2 managed PoE Switch.',
    imageUrl: hero,
    features: ['16*10M/100M/1000M RJ45 port PoE', '2*100M/1G SFP UPLINK', 'Total PoE budget 350 watt']
  },
  {
    id: 29,
    model: 'DMS-28GPP-4C',
    category: 'Fully Managed Switches',
    segment: 'Managed POE',
    description: 'Layer 2 managed PoE Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port PoE', '4*100M/1G combo (SFP/RJ-45) UPLINK', 'Total PoE budget 400 watt']
  },
  {
    id: 30,
    model: 'DMS-28GPP-4C-DAC',
    category: 'Fully Managed Switches',
    segment: 'Managed POE',
    description: 'Layer 2 managed PoE Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port PoE', '4*100M/1G combo (SFP/RJ-45) UPLINK', 'Dual Power supply']
  },
  {
    id: 31,
    model: 'DMS-24GPP25-2XF',
    category: 'Fully Managed Switches',
    segment: 'Managed POE',
    description: 'Layer 2 managed PoE Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M/2.5G RJ45 port PoE', '2*10G SFP UPLINK', 'Total PoE budget 400 watt']
  },
  {
    id: 32,
    model: 'DMS-48GP-4F',
    category: 'Fully Managed Switches',
    segment: 'Managed POE',
    description: 'Layer 2 managed PoE Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ45 port PoE', '4*100M/1G SFP UPLINK', 'Total PoE budget 600 watt']
  },

  // Fully Managed Switches - Managed Non POE
  {
    id: 33,
    model: 'DMS-8G-2F',
    category: 'Fully Managed Switches',
    segment: 'Managed Non POE',
    description: 'Layer 2 managed Non PoE Switch.',
    imageUrl: hero,
    features: ['8*10M/100M/1000M RJ45 port', '2*100/1000Mbps SFP UPLINK', 'Robust and Reliable']
  },
  {
    id: 34,
    model: 'DMS-9F-2G',
    category: 'Fully Managed Switches',
    segment: 'Managed Non POE',
    description: 'Layer 2 managed Non PoE Switch.',
    imageUrl: hero,
    features: ['9*10M/100M/1000M SFP Fiber ports', '2*100/1000Mbps RJ-45 Ports', 'Robust and Reliable']
  },
  {
    id: 35,
    model: 'DMS-16G-2F',
    category: 'Fully Managed Switches',
    segment: 'Managed Non POE',
    description: 'Layer 2 managed Non PoE Switch.',
    imageUrl: hero,
    features: ['16*10M/100M/1000M RJ45 port', '2*100/1000Mbps SFP UPLINK', 'Robust and Reliable']
  },
  {
    id: 36,
    model: 'DMS-18F-8G',
    category: 'Fully Managed Switches',
    segment: 'Managed Non POE',
    description: 'Layer 2 managed Non PoE Switch.',
    imageUrl: hero,
    features: ['18*10M/100M/1000M SFP Fiber ports', '8*100/1000Mbps RJ-45 Ports', 'Robust and Reliable']
  },
  {
    id: 37,
    model: 'DMS-28G-4C',
    category: 'Fully Managed Switches',
    segment: 'Managed Non POE',
    description: 'Layer 2 managed Non PoE Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '4*100M/1G combo (SFP/RJ-45) UPLINK', 'Robust and Reliable']
  },
  {
    id: 38,
    model: 'DMS-28G-4C-DAC',
    category: 'Fully Managed Switches',
    segment: 'Managed Non POE',
    description: 'Layer 2 managed Non PoE Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '4*100M/1G combo (SFP/RJ-45) UPLINK', 'Dual Power supply']
  },
  {
    id: 39,
    model: 'DMS-48G-4F',
    category: 'Fully Managed Switches',
    segment: 'Managed Non POE',
    description: 'Layer 2 managed Non PoE Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ45 port', '4*100M/1000Mbps SFP UPLINK', 'Robust and Reliable']
  },

  // Layer 3 Switches - Layer 3 Switches
  {
    id: 40,
    model: 'DCLS-8G-4XF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['8*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Robust and Reliable']
  },
  {
    id: 41,
    model: 'DCLS-8G-4XF-R',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['8*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Redundant power supply']
  },
  {
    id: 42,
    model: 'DCLS-24G-4XF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'High performance']
  },
  {
    id: 43,
    model: 'DCLS-24G-4XF-R',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Redundant Power supply']
  },
  {
    id: 44,
    model: 'DCLS-24G-4XF-2S',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', '2* 10G Stacking ports']
  },
  {
    id: 45,
    model: 'DCLS-24G-4XF-2S-R',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Redundant Power Supply']
  },
  {
    id: 46,
    model: 'DCLS-24G-4XF-R-MPF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Redundant Modular Power supply and FAN']
  },
  {
    id: 47,
    model: 'DCLS-24G-4XF-2S-R-MPF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Redundant modular Power Supply and FAN']
  },
  {
    id: 48,
    model: 'DCLS-24G25-4XF-2S',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M/2.5G RJ45 port', '4*10G SFP UPLINK', 'Switch Stacking']
  },
  {
    id: 49,
    model: 'DCLS-24G25-4XF-2S-R',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M/2.5G RJ45 port', '4*10G SFP UPLINK', 'Redundant Power Supply']
  },
  {
    id: 50,
    model: 'DCLS-24G25-4XF-2S-R-MPF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M/2.5G RJ45 port', '4*10G SFP UPLINK', 'Redundant Modular Power Supply and FAN']
  },
  {
    id: 51,
    model: 'DCLS-12XF-R',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['12*1G/10G SFP Ports', 'Robust and High performance', 'Redundant Power supply']
  },
  {
    id: 52,
    model: 'DCLS-12XF-R-DC',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['12*1G/10G SFP Ports', 'Robust and High performance', 'Redundant DC Power input']
  },
  {
    id: 53,
    model: 'DCLS-12XF-R-MPF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['12*1G/10G SFP Ports', 'Robust and High performance', 'Redundant Modular Power supply']
  },
  {
    id: 54,
    model: 'DCLS-16F-8C-4XF-R',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['16*100M/1G SFP', '8*1G Combo (RJ-45 and SFP)', '4*10G SFP UPLINK']
  },
  {
    id: 55,
    model: 'DCLS-16F-8C-4XF-R-MPF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['16*100M/1G SFP', '8*1G Combo (RJ-45 and SFP)', 'Redundant modular Power supply']
  },
  {
    id: 56,
    model: 'DCLS-48G-4XF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'High performance']
  },
  {
    id: 57,
    model: 'DCLS-48G-4XF-R',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Redundant Power supply']
  },
  {
    id: 58,
    model: 'DCLS-48G-4XF-2S',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Switch Stacking']
  },
  {
    id: 59,
    model: 'DCLS-48G-4XF-2S-R',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Redundant Power Supply']
  },
  {
    id: 60,
    model: 'DCLS-48G-4XF-R-MPF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Redundant Modular Power supply and FAN']
  },
  {
    id: 61,
    model: 'DCLS-48G-4XF-2S-R-MPF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed Non PoE Access Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Redundant modular Power Supply and FAN']
  },
  {
    id: 62,
    model: 'DCLS-8GP-4XF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['8*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 150 watt']
  },
  {
    id: 63,
    model: 'DCLS-8GP-4XF-R',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['8*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 300 watt']
  },
  {
    id: 64,
    model: 'DCLS-24GPP-4XF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 400 watt']
  },
  {
    id: 65,
    model: 'DCLS-24GPP-4XF-R',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 800 watt']
  },
  {
    id: 66,
    model: 'DCLS-24GPP-4XF-2S',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 400 watt']
  },
  {
    id: 67,
    model: 'DCLS-24GPP-4XF-2S-R',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 800 watt']
  },
  {
    id: 68,
    model: 'DCLS-24GP-4XF-R-MPF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 800 watt']
  },
  {
    id: 69,
    model: 'DCLS-24GPP-4XF-R-MPF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 960 watt']
  },
  {
    id: 70,
    model: 'DCLS-24GP-4XF-2S-R-MPF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 800 watt']
  },
  {
    id: 71,
    model: 'DCLS-24GPP-4XF-2S-R-MPF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 960 watt']
  },
  {
    id: 72,
    model: 'DCLS-24GPP25-4XF-2S',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M/2.5G RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 400 watt']
  },
  {
    id: 73,
    model: 'DCLS-24GPP25-4XF-2S-R',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M/2.5G RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 800 watt']
  },
  {
    id: 74,
    model: 'DCLS-24GP25-4XF-2S-R-MPF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M/2.5G RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 800 watt']
  },
  {
    id: 75,
    model: 'DCLS-24GPP25-4XF-2S-R-MPF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M/2.5G RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 960 watt']
  },
  {
    id: 76,
    model: 'DCLS-48GPP-4XF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 800 watt']
  },
  {
    id: 77,
    model: 'DCLS-48GPP-4XF-R',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 1600 watt']
  },
  {
    id: 78,
    model: 'DCLS-48GPP-4XF-2S',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 800 watt']
  },
  {
    id: 79,
    model: 'DCLS-48GPP-4XF-2S-R',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 1600 watt']
  },
  {
    id: 80,
    model: 'DCLS-48GP-4XF-R-MPF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 1600 watt']
  },
  {
    id: 81,
    model: 'DCLS-48GPP-4XF-R-MPF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 1720 watt']
  },
  {
    id: 82,
    model: 'DCLS-48GP-4XF-2S-R-MPF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 1600 watt']
  },
  {
    id: 83,
    model: 'DCLS-48GPP-4XF-2S-R-MPF',
    category: 'Layer 3 Switches',
    segment: 'Layer 3 Switches',
    description: 'Layer 3 Managed PoE Access Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Total PoE budget 1720 watt']
  },

  // Core Switches - Non POE Switches
  {
    id: 84,
    model: 'DCS-8F-4C-4XF',
    category: 'Core Switches',
    segment: 'Non POE Switches',
    description: 'Layer 3 Managed Non PoE Core Switch.',
    imageUrl: hero,
    features: ['8*1G SFP + 4*1G Combo + 4*10G SFP+ Ports', 'Robust and High performance', 'Dual AC + DC Power Supply']
  },
  {
    id: 85,
    model: 'DCS-16F-8C-4XF',
    category: 'Core Switches',
    segment: 'Non POE Switches',
    description: 'Layer 3 Managed Non PoE Core Switch.',
    imageUrl: hero,
    features: ['16*1G SFP + 8*1G Combo + 4*10G SFP+ Ports', 'Robust and High performance', 'Dual AC + DC Power Supply']
  },
  {
    id: 86,
    model: 'DCS-16F-8C-4XF-E',
    category: 'Core Switches',
    segment: 'Non POE Switches',
    description: 'Layer 3 Managed Non PoE Core Switch.',
    imageUrl: hero,
    features: ['16*1G SFP + 8*1G Combo + 4*10G SFP+ Ports', 'SDN functionality', 'Dual AC + DC Power Supply']
  },
  {
    id: 87,
    model: 'DCS-24G-4XF',
    category: 'Core Switches',
    segment: 'Non POE Switches',
    description: 'Layer 3 Managed Non PoE Core Switch.',
    imageUrl: hero,
    features: ['24*10M/100M/1000M RJ45 port', '4*10G SFP UPLINK', 'Advance L3 features']
  },
  {
    id: 88,
    model: 'DCS-16C-8F-4XF-2S',
    category: 'Core Switches',
    segment: 'Non POE Switches',
    description: 'Layer 3 Managed Non PoE Core Switch.',
    imageUrl: hero,
    features: ['16*1G Combo + 8*1G SFP + 4*10G (SFP+)', 'Robust and High performance', 'Dual Modular AC Power Supply']
  },
  {
    id: 89,
    model: 'DCS-20F-4C-4XF-AL',
    category: 'Core Switches',
    segment: 'Non POE Switches',
    description: 'Layer 3 Managed Non PoE Core Switch.',
    imageUrl: hero,
    features: ['20*1G SFP + 4*1G Combo + 4*10G SFP+ Ports', 'Redundant Power Supply', 'Robust and High performance']
  },
  {
    id: 90,
    model: 'DCS-20G-4C-4XF',
    category: 'Core Switches',
    segment: 'Non POE Switches',
    description: 'Layer 3 Managed Non PoE Core Switch.',
    imageUrl: hero,
    features: ['20*1G + 4*1G Combo + 4*10G SFP+ Ports', 'SDN functionality', 'Redundant Power supply and FAN']
  },
  {
    id: 91,
    model: 'DCS-48F-4XF',
    category: 'Core Switches',
    segment: 'Non POE Switches',
    description: 'Layer 3 Managed Non PoE Core Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M SFP port', '4*10G SFP UPLINK ports', 'Dual AC + DC Power Supply']
  },
  {
    id: 92,
    model: 'DCS-48G-4XF',
    category: 'Core Switches',
    segment: 'Non POE Switches',
    description: 'Layer 3 Managed Non PoE Core Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ-45 port', '4*10G SFP UPLINK ports', 'Advance L3 features']
  },
  {
    id: 93,
    model: 'DCS-48G-4XF-E',
    category: 'Core Switches',
    segment: 'Non POE Switches',
    description: 'Layer 3 Managed Non PoE Core Switch.',
    imageUrl: hero,
    features: ['48*10M/100M/1000M RJ-45 port', '4*10G SFP UPLINK ports', 'SDN Functionality']
  },
  {
    id: 94,
    model: 'DDS-24XF-2QXF28-AL',
    category: 'Core Switches',
    segment: 'Non POE Switches',
    description: 'Layer 3 Managed Non PoE Core Switch.',
    imageUrl: hero,
    features: ['24*10G SFP+ + 2*40G/100G QSFP28 Ports', 'Redundant Modular Power Supply and FAN', 'Robust and High performance']
  },
  {
    id: 95,
    model: 'DDS-32QXF28-AL',
    category: 'Core Switches',
    segment: 'Non POE Switches',
    description: 'Layer 3 Managed Non PoE Core Switch.',
    imageUrl: hero,
    features: ['32*100G QSFP28 100G Ports', 'Data Center Routing Fiber Switch', 'Redundant Modular Power Supply and FAN']
  },
  {
    id: 96,
    model: 'DDS-48XF-6QXF',
    category: 'Core Switches',
    segment: 'Non POE Switches',
    description: 'Layer 3 Managed Non PoE Core Switch.',
    imageUrl: hero,
    features: ['48 x 10G SFP+ and 6 x 40G QSFP Ports', 'Data Center Routing Fiber Switch', 'Redundant Modular Power Supply and FAN']
  },
  {
    id: 97,
    model: 'DDS-48XF-6QFX28-AL',
    category: 'Core Switches',
    segment: 'Non POE Switches',
    description: 'Layer 3 Managed Non PoE Core Switch.',
    imageUrl: hero,
    features: ['48 x 10G SFP+ and 6 x 100G QSFP28 Ports', 'Data Center Routing Fiber Switch', 'Redundant Modular Power Supply and FAN']
  },
  {
    id: 98,
    model: 'DDS-48XF28-8QXF28-AL',
    category: 'Core Switches',
    segment: 'Non POE Switches',
    description: 'Layer 3 Managed Non PoE Core Switch.',
    imageUrl: hero,
    features: ['48*25G/10G SFP28 + 8*100G QSFP28 Ports', 'Data Center Routing Fiber Switch', 'Redundant Modular Power Supply and FAN']
  },
  {
    id: 99,
    model: 'DDS-48XF28-6QXF28',
    category: 'Core Switches',
    segment: 'Non POE Switches',
    description: 'Layer 3 Managed Non PoE Core Switch.',
    imageUrl: hero,
    features: ['48*25G/10G SFP28 + 6*100G QSFP28 Ports', 'SDN Functionality', 'Redundant Modular Power Supply and FAN']
  },
  {
    id: 100,
    model: 'DCH-6204-2AC',
    category: 'Core Switches',
    segment: 'Non POE Switches',
    description: 'Layer 3 Managed Non PoE Core Switch.',
    imageUrl: hero,
    features: ['4-slot Chassis', 'Data Centre Core Switch', '1+1 AC Modular Power Supply']
  },
  {
    id: 101,
    model: 'DCH-6208-3AC',
    category: 'Core Switches',
    segment: 'Non POE Switches',
    description: 'Layer 3 Managed Non PoE Core Switch.',
    imageUrl: hero,
    features: ['10-slot Chassis', 'Data Centre Core Switch', '2+1 AC Modular Power Supply']
  },
  {
    id: 102,
    model: 'DCH-8216-4AC',
    category: 'Core Switches',
    segment: 'Non POE Switches',
    description: 'Layer 3 Managed Non PoE Core Switch.',
    imageUrl: hero,
    features: ['18-slot Chassis', 'Data Centre Core Switch', '3+1 AC Modular Power Supply']
  },

  // Core Switches - POE Switches
  {
    id: 103,
    model: 'DCS-20GPP-4CPP-4XF',
    category: 'Core Switches',
    segment: 'POE Switches',
    description: 'Layer 3 Managed PoE Core Switch.',
    imageUrl: hero,
    features: ['20*1G + 4*1G Combo + 4*10G SFP+ Ports', 'Robust and High performance', 'Total PoE budget 370 watt']
  },
  {
    id: 104,
    model: 'DCS-24GPP25-4XF-2QXF',
    category: 'Core Switches',
    segment: 'POE Switches',
    description: 'Layer 3 Managed PoE Core Switch.',
    imageUrl: hero,
    features: ['24*1G/2.5G + 4*10G SFP+ + 2*40G QSFP+ Ports', 'Dual Modular AC Power Supply', 'Total PoE budget 1060 watt']
  },
  {
    id: 105,
    model: 'DCS-48GPP-4XF',
    category: 'Core Switches',
    segment: 'POE Switches',
    description: 'Layer 3 Managed PoE Core Switch.',
    imageUrl: hero,
    features: ['48*1G + 4*10G SFP+ Ports', 'Dual AC + DC Power Supply', 'Total PoE budget 740 watt']
  },
  {
    id: 106,
    model: 'DCS-48GPP-4XF-E',
    category: 'Core Switches',
    segment: 'POE Switches',
    description: 'Layer 3 Managed PoE Core Switch.',
    imageUrl: hero,
    features: ['48*1G + 4*10G SFP+ Ports', 'Dual Modular AC Power Supply', 'Total PoE budget 740 watt']
  },
  {
    id: 107,
    model: 'DCS-48GPP25-4XF-2QXF28-AL',
    category: 'Core Switches',
    segment: 'POE Switches',
    description: 'Layer 3 Managed PoE Core Switch.',
    imageUrl: hero,
    features: ['48*1000M/2.5G RJ45 port', '4*10G SFP+fiber port', 'Total PoE budget 1200 watt']
  },

  // Accessories - Essential
  {
    id: 108,
    model: 'DSM-20',
    category: 'Accessories',
    segment: 'Essential',
    description: '1G SFP LX Single-mode 1310nm 20km Optical Transceiver Module.',
    imageUrl: hero,
    features: ['1G SFP LX', 'Single-mode 1310nm', '20km reach']
  },
  {
    id: 109,
    model: 'DSM-1GLR-10BIDI-3155',
    category: 'Accessories',
    segment: 'Essential',
    description: '1Gb/s SFP BIDI 10Km Reach TX1310nm/ RX1550nm Optical Transceiver Module.',
    imageUrl: hero,
    features: ['1Gb/s SFP BIDI', 'TX1310nm/ RX1550nm', '10Km reach']
  },
  {
    id: 110,
    model: 'DSM-1GLR-10BIDI-5531',
    category: 'Accessories',
    segment: 'Essential',
    description: '1Gb/s SFP BIDI 10Km Reach TX1550nm/ RX1310nm Optical Transceiver Module.',
    imageUrl: hero,
    features: ['1Gb/s SFP BIDI', 'TX1550nm/ RX1310nm', '10Km reach']
  },
  {
    id: 111,
    model: 'DSM-1GLR-40BIDI-3155',
    category: 'Accessories',
    segment: 'Essential',
    description: '1Gb/s SFP BIDI 40Km Reach TX1310nm/ RX1550nm Optical Transceiver Module.',
    imageUrl: hero,
    features: ['1Gb/s SFP BIDI', 'TX1310nm/ RX1550nm', '40Km reach']
  },
  {
    id: 112,
    model: 'DSM-1GLR-40BIDI-5531',
    category: 'Accessories',
    segment: 'Essential',
    description: '1Gb/s SFP BIDI 40Km Reach TX1550nm/ RX1310nm Optical Transceiver Module.',
    imageUrl: hero,
    features: ['1Gb/s SFP BIDI', 'TX1550nm/ RX1310nm', '40Km reach']
  },
  {
    id: 113,
    model: 'DSM-1GLR-80BIDI-4955',
    category: 'Accessories',
    segment: 'Essential',
    description: '1Gbps SFP BIDI 80Km Reach TX1490nm / RX1550nm Optical Transceiver Module.',
    imageUrl: hero,
    features: ['1Gbps SFP BIDI', 'TX1490nm / RX1550nm', '80Km reach']
  },
  {
    id: 114,
    model: 'DSM-1GLR-80BIDI-5549',
    category: 'Accessories',
    segment: 'Essential',
    description: '1Gbps SFP BIDI 80Km Reach TX1550nm / RX1490nm Optical Transceiver Module.',
    imageUrl: hero,
    features: ['1Gbps SFP BIDI', 'TX1550nm / RX1490nm', '80Km reach']
  },
  {
    id: 115,
    model: 'DSM-10GLR-10BIDI-2733',
    category: 'Accessories',
    segment: 'Essential',
    description: '10Gbps SFP+ BIDI Transceiver, Single mode, 10Km Reach.',
    imageUrl: hero,
    features: ['10Gbps SFP+ BIDI', '1270nm TX / 1330nm RX', '10Km reach']
  },
  {
    id: 116,
    model: 'DSM-10GLR-10BIDI-3327',
    category: 'Accessories',
    segment: 'Essential',
    description: '10Gbps SFP+ BIDI Transceiver, Single mode, 10Km Reach.',
    imageUrl: hero,
    features: ['10Gbps SFP+ BIDI', '1330nm TX / 1270nm RX', '10Km reach']
  },
  {
    id: 117,
    model: 'DSM-10GLR-20BIDI-2733',
    category: 'Accessories',
    segment: 'Essential',
    description: '10Gbps SFP+ BIDI Transceiver, Single mode, 20Km Reach.',
    imageUrl: hero,
    features: ['10Gbps SFP+ BIDI', '1270nm TX / 1330nm RX', '20Km reach']
  },
  {
    id: 118,
    model: 'DSM-10GLR-20BIDI-3327',
    category: 'Accessories',
    segment: 'Essential',
    description: '10Gbps SFP+ BIDI Transceiver, Single mode, 20Km Reach.',
    imageUrl: hero,
    features: ['10Gbps SFP+ BIDI', '1330nm TX / 1270nm RX', '20Km reach']
  },
  {
    id: 119,
    model: 'DSM-10GLR',
    category: 'Accessories',
    segment: 'Essential',
    description: '10G SFP LX Single-mode 1310nm 10km Optical Transceiver Module.',
    imageUrl: hero,
    features: ['10G SFP LX', 'Single-mode 1310nm', '10km reach']
  },
  {
    id: 120,
    model: 'DSM-10GLR-2',
    category: 'Accessories',
    segment: 'Essential',
    description: '10G SFP LX Single-mode 1310nm 20km Optical Transceiver Module.',
    imageUrl: hero,
    features: ['10G SFP LX', 'Single-mode 1310nm', '20km reach']
  },
  {
    id: 121,
    model: 'DCM-1G',
    category: 'Accessories',
    segment: 'Essential',
    description: '1G BASE-T (RJ-45) Copper SFP Transceiver.',
    imageUrl: hero,
    features: ['1G BASE-T', 'RJ-45 Copper', 'Up to 100 meters']
  },
  {
    id: 122,
    model: 'DCM-10G',
    category: 'Accessories',
    segment: 'Essential',
    description: '10G BASE-T (RJ-45) Copper SFP Transceiver.',
    imageUrl: hero,
    features: ['10G BASE-T', 'RJ-45 Copper', 'Up to 30 meters']
  },
  {
    id: 123,
    model: 'DCM-10G-80',
    category: 'Accessories',
    segment: 'Essential',
    description: '10G BASE-T (RJ-45) Copper SFP Transceiver.',
    imageUrl: hero,
    features: ['10G BASE-T', 'RJ-45 Copper', 'Up to 80 meters']
  },
  {
    id: 124,
    model: 'DSM-40',
    category: 'Accessories',
    segment: 'Essential',
    description: '1G SFP LX Single-mode 1310nm 40km Optical Transceiver Module.',
    imageUrl: hero,
    features: ['1G SFP LX', 'Single-mode 1310nm', '40km reach']
  },
  {
    id: 125,
    model: 'DSM-80',
    category: 'Accessories',
    segment: 'Essential',
    description: '1G SFP LX Single-mode 1310nm 80km Optical Transceiver Module.',
    imageUrl: hero,
    features: ['1G SFP LX', 'Single-mode 1310nm', '80km reach']
  },
  {
    id: 126,
    model: 'DSM-120',
    category: 'Accessories',
    segment: 'Essential',
    description: '1G SFP LX Single-mode 1310nm 120km Optical Transceiver Module.',
    imageUrl: hero,
    features: ['1G SFP LX', 'Single-mode 1310nm', '120km reach']
  },
  {
    id: 127,
    model: 'DSM-10GER-4',
    category: 'Accessories',
    segment: 'Essential',
    description: '10G SFP LX Single-mode 1550nm 40km Optical Transceiver Module.',
    imageUrl: hero,
    features: ['10G SFP LX', 'Single-mode 1550nm', '40km reach']
  },
  {
    id: 128,
    model: 'DSM-10GZR-8',
    category: 'Accessories',
    segment: 'Essential',
    description: '10G SFP LX Single-mode 1550nm 80km Optical Transceiver Module.',
    imageUrl: hero,
    features: ['10G SFP LX', 'Single-mode 1550nm', '80km reach']
  },
  {
    id: 129,
    model: 'DSM-25GLR',
    category: 'Accessories',
    segment: 'Essential',
    description: '25G SFP LX Single-mode 1310nm 10km Optical Transceiver Module.',
    imageUrl: hero,
    features: ['25G SFP LX', 'Single-mode 1310nm', '10km reach']
  },
  {
    id: 130,
    model: 'DSM-40GLR-10',
    category: 'Accessories',
    segment: 'Essential',
    description: '40G SFP LX Single-mode 10km Optical Transceiver Module.',
    imageUrl: hero,
    features: ['40G SFP LX', 'Single-mode', '10km reach']
  },
  {
    id: 131,
    model: 'DSM-40GER-40',
    category: 'Accessories',
    segment: 'Essential',
    description: '40G SFP LX Single-mode 40km Optical Transceiver Module.',
    imageUrl: hero,
    features: ['40G SFP LX', 'Single-mode', '40km reach']
  },
  {
    id: 132,
    model: 'DSM-100GLR',
    category: 'Accessories',
    segment: 'Essential',
    description: '100G QSFP28 LR4 Single-mode 10km Optical Transceiver Module.',
    imageUrl: hero,
    features: ['100G QSFP28 LR4', 'Single-mode', '10km reach']
  },
  {
    id: 133,
    model: 'DMM-1GSR',
    category: 'Accessories',
    segment: 'Essential',
    description: '1G SFP LX multi-mode 850nm 550m Optical Transceiver Module.',
    imageUrl: hero,
    features: ['1G SFP LX', 'Multi-mode 850nm', '550m reach']
  },
  {
    id: 134,
    model: 'DMM-10GSR',
    category: 'Accessories',
    segment: 'Essential',
    description: '10G SFP LX multi-mode 850nm 550m Optical Transceiver Module.',
    imageUrl: hero,
    features: ['10G SFP LX', 'Multi-mode 850nm', '550m reach']
  },
  {
    id: 135,
    model: 'DMM-25GSR',
    category: 'Accessories',
    segment: 'Essential',
    description: '25G SFP LX multi-mode 850nm 100m Optical Transceiver Module.',
    imageUrl: hero,
    features: ['25G SFP LX', 'Multi-mode 850nm', '100m reach']
  },
  {
    id: 136,
    model: 'DMM-40GSR',
    category: 'Accessories',
    segment: 'Essential',
    description: '40G SFP LX multi-mode 850nm 100m Optical Transceiver Module.',
    imageUrl: hero,
    features: ['40G SFP LX', 'Multi-mode 850nm', '100m reach']
  },
  {
    id: 137,
    model: 'DMM-100GSR',
    category: 'Accessories',
    segment: 'Essential',
    description: '100G QSFP28 SR4 multi-mode 100m Optical Transceiver Module.',
    imageUrl: hero,
    features: ['100G QSFP28 SR4', 'Multi-mode', '100m reach']
  },
  {
    id: 138,
    model: 'DPI-90G',
    category: 'Accessories',
    segment: 'Essential',
    description: 'Single Port High performance 802.11BT Gigabit PoE injector 90W.',
    imageUrl: hero,
    features: ['802.11BT', 'Gigabit PoE', '90W output']
  },
  {
    id: 139,
    model: 'DDC-XF-1M-AL',
    category: 'Accessories',
    segment: 'Essential',
    description: '10G SFP+ Direct Attach Passive Copper Cables.',
    imageUrl: hero,
    features: ['10G SFP+', 'Direct Attach', 'Passive Copper']
  },
  {
    id: 140,
    model: 'DDC-XF28-1M-AL',
    category: 'Accessories',
    segment: 'Essential',
    description: '25G SFP28 Direct Attach Passive Copper Cables.',
    imageUrl: hero,
    features: ['25G SFP28', 'Direct Attach', 'Passive Copper']
  },
  {
    id: 141,
    model: 'DDC-QXF-1M-AL',
    category: 'Accessories',
    segment: 'Essential',
    description: '40G QSFP+ Direct Attach Passive Copper Cables.',
    imageUrl: hero,
    features: ['40G QSFP+', 'Direct Attach', 'Passive Copper']
  },
  {
    id: 142,
    model: 'DDC-QXF28-1M-AL',
    category: 'Accessories',
    segment: 'Essential',
    description: '100G QSFP28 Direct Attach Passive Copper Cables.',
    imageUrl: hero,
    features: ['100G QSFP28', 'Direct Attach', 'Passive Copper']
  },

  // Accessories - Media Convertors
  {
    id: 143,
    model: 'SMCL-1G1S',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: 'Rugged Media Converter.',
    imageUrl: hero,
    features: ['1*10/100/1000Tx', '1*100/1000 SFP Slot', 'Rugged design']
  },
  {
    id: 144,
    model: 'SMCL-2G2F-SFP-E',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: 'Rugged Media Converter.',
    imageUrl: hero,
    features: ['2*10/100/1000Tx', '2*100/1000 SFP Slot', 'Rugged design']
  },
  {
    id: 145,
    model: 'OMC-1G1F-SFP',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: 'Gigabit SFP Fiber Media Converter.',
    imageUrl: hero,
    features: ['1*10/100/1000Tx', '1*100/1000 SFP Slot', 'Gigabit speed']
  },
  {
    id: 146,
    model: 'DMC-1G1F-BIDI-3155',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: 'Gigabit Single Fiber Media Converter with SC Fiber Port.',
    imageUrl: hero,
    features: ['1310nm / 1550nm', 'Single fiber bi-directional', 'SC Fiber Port']
  },
  {
    id: 147,
    model: 'DMC-1G1F-BIDI-5531',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: 'Gigabit Single Fiber Media Converter with SC Fiber Port.',
    imageUrl: hero,
    features: ['1550nm / 1310nm', 'Single fiber bi-directional', 'SC Fiber Port']
  },
  {
    id: 148,
    model: 'DMC-2G1F-SC-E',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: 'Gigabit SFP Fiber Media Converter.',
    imageUrl: hero,
    features: ['2*10/100/1000Tx', '1*100/1000 SC fiber port', 'Dual port']
  },
  {
    id: 149,
    model: 'DMC-2G1F-SFP-E',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: 'Gigabit SFP Fiber Media Converter.',
    imageUrl: hero,
    features: ['2*10/100/1000Tx', '1*100/1000 SFP Slot', 'Dual port']
  },
  {
    id: 150,
    model: 'DMC-1E1F-SM-20',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: 'Fast Ethernet Single Mode Dual Fiber Media Converter.',
    imageUrl: hero,
    features: ['1*10/100Tx', '1*100Fx SC Fiber Port', 'Single Mode']
  },
  {
    id: 151,
    model: 'DMC-1E1F-MM-20',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: 'Fast Ethernet Multi-Mode Dual Fiber Media Converter.',
    imageUrl: hero,
    features: ['1*10/100Tx', '1*100Fx SC Fiber Port', 'Multi-Mode']
  },
  {
    id: 152,
    model: 'DMC-1G1F-LC-20-E',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: 'Gigabit Single Mode Dual Fiber Media Converter.',
    imageUrl: hero,
    features: ['1*10/100/1000Tx', '1*100/1000 LC Fiber Port', 'Single Mode']
  },
  {
    id: 153,
    model: 'DMC-1G1F-SC-SM20-E',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: 'Gigabit Single Mode Dual Fiber Media Converter.',
    imageUrl: hero,
    features: ['1*10/100/1000Tx', '1*100/1000 SC Fiber Port', 'Single Mode']
  },
  {
    id: 154,
    model: 'DMC-1G1F-SC-MM2-E',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: 'Gigabit Multi Mode Dual Fiber Media Converter.',
    imageUrl: hero,
    features: ['1*10/100/1000Tx', '1*100/1000 SC Fiber Port', 'Multi Mode']
  },
  {
    id: 155,
    model: 'DMC-1G1F-SFP',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: 'Gigabit SFP Fiber Media Converter.',
    imageUrl: hero,
    features: ['1*10/100/1000Tx', '1*100/1000 SFP Slot', 'Gigabit speed']
  },
  {
    id: 156,
    model: 'DMC-2G2F-SFP-E',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: 'Gigabit SFP Fiber Media Converter.',
    imageUrl: hero,
    features: ['2*10/100/1000Tx', '2*100/1000 SFP Slot', 'Dual port']
  },
  {
    id: 157,
    model: 'DMC-1XG1XF-SFP-E',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: 'Gigabit SFP Fiber Media Converter.',
    imageUrl: hero,
    features: ['1*10GTx', '1*10G SFP Slot', '10G speed']
  },
  {
    id: 158,
    model: 'DMCH-214-AC',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: '2U 14-slot Rackmount Chassis Media Converter.',
    imageUrl: hero,
    features: ['14-slot Chassis', 'Centralized Management', '2U Rackmount']
  },
  {
    id: 159,
    model: 'DMCH-216-AC',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: '2U 16-slot Rackmount Chassis Media Converter.',
    imageUrl: hero,
    features: ['16-slot Chassis', 'Centralized Management', '2U Rackmount']
  },
  {
    id: 160,
    model: 'DMCC-1E1F-SM-SC (Card)',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: 'Fast Ethernet Single Mode Single Fiber Card-type Media Converter.',
    imageUrl: hero,
    features: ['1*10/100Tx', '1*100Fx SC Port', 'Card-type']
  },
  {
    id: 161,
    model: 'DMCC-1E1F-MM-SC (Card)',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: 'Fast Ethernet Multi-Mode Single Fiber Card-type Media Converter.',
    imageUrl: hero,
    features: ['1*10/100Tx', '1*100Fx SC Port', 'Card-type']
  },
  {
    id: 162,
    model: 'DMCC-1G1F-SM-SC (Card)',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: 'Gigabit Single Mode Single Fiber Card-type Media Converter.',
    imageUrl: hero,
    features: ['1*10/100/1000Tx', '1*100/1000 Fx SC Port', 'Card-type']
  },
  {
    id: 163,
    model: 'DMCC-1G1F-MM-SC (Card)',
    category: 'Accessories',
    segment: 'Media Convertors',
    description: 'Gigabit Multi Mode Single Fiber Card-type Media Converter.',
    imageUrl: hero,
    features: ['1*10/100/1000Tx', '1*100/1000 Fx SC Port', 'Card-type']
  },

  // Accessories - Power Supply
  {
    id: 164,
    model: 'EDR-75-48',
    category: 'Accessories',
    segment: 'Power Supply',
    description: '75W Industrial DIN Rail Power Supply.',
    imageUrl: hero,
    features: ['75W', '48VDC', 'Universal AC input']
  },
  {
    id: 165,
    model: 'EDR-120-48',
    category: 'Accessories',
    segment: 'Power Supply',
    description: '120W Industrial DIN Rail Power Supply.',
    imageUrl: hero,
    features: ['120W', '48VDC', 'Universal AC input']
  },
  {
    id: 166,
    model: 'NDR-240-48',
    category: 'Accessories',
    segment: 'Power Supply',
    description: '240W Industrial DIN Rail Power Supply.',
    imageUrl: hero,
    features: ['240W', '48VDC', 'Universal AC input']
  },
  {
    id: 167,
    model: 'NDR-480-48',
    category: 'Accessories',
    segment: 'Power Supply',
    description: '480W Industrial DIN Rail Power Supply.',
    imageUrl: hero,
    features: ['480W', '48VDC', 'Universal AC input']
  },
];

const relatedProductsData = [
  { id: 1, name: 'ASW-1200', imageUrl: hero },
  { id: 2, name: 'AXW-3000', imageUrl: hero },
  { id: 3, name: 'ASC-1200L V2', imageUrl: hero },
  { id: 4, name: 'AXC-3600', imageUrl: hero },
  { id: 5, name: 'AOS-1200', imageUrl: hero },
  { id: 6, name: 'AXO-1800L', imageUrl: hero },
  { id: 7, name: 'AWG-3000', imageUrl: hero },
  { id: 8, name: 'AWG-5000', imageUrl: hero },
  { id: 9, name: 'AWG-7000', imageUrl: hero },
];

const RelatedProductsSection = () => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="w-full bg-white py-10 border-t mt-15 border-gray-100">
      <div className="max-w-7xl mx-auto px-4 relative group">
        <h1 className="text-2xl font-extrabold md:text-2xl text-green-700 mb-8 text-center">
          Related Products
        </h1>

        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x snap-mandatory items-end"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {relatedProductsData.map((item) => (
            <Link
              key={item.id}
              to={`/product/${item.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-[150px] md:min-w-[200px] flex-shrink-0 snap-start group/card cursor-pointer block no-underline"
            >
              <div className="relative p-2 flex flex-col items-center">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-auto object-contain max-h-[100px]"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-white/90 py-1.5 text-center text-[10px] font-bold text-gray-500 opacity-0 group-hover/card:opacity-100 transition-opacity border-t border-gray-100 shadow-sm">
                  Quick View
                </div>
              </div>
              <h3 className="mt-3 text-center font-bold text-gray-700 text-[16px] uppercase tracking-tighter">
                {item.name}
              </h3>
            </Link>
          ))}
        </div>

        <button
          onClick={() => scroll('left')}
          className="absolute -left-2 top-[45%] bg-white/80 shadow rounded-full p-1 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity z-20"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={() => scroll('right')}
          className="absolute -right-2 top-[45%] bg-white/80 shadow rounded-full p-1 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity z-20"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const ProductCategoryPage = () => {
  const [activeCategory, setActiveCategory] = useState('Unmanaged Switches');
  const [activeSegment, setActiveSegment] = useState('Un Managed Non POE');

  // Define which segments are available for each category
  const categorySegments = {
    'Unmanaged Switches': ['Un Managed Non POE'],
    'Web Smart Switches': ['Web Smart POE', 'Web Smart Non POE'],
    'Fully Managed Switches': ['Managed POE', 'Managed Non POE'],
    'Layer 3 Switches': ['Layer 3 Switches'],
    'Core Switches': ['POE Switches', 'Non POE Switches'],
    'Accessories': ['Essential', 'Media Convertors', 'Power Supply']
  };

  // Update segment when category changes
  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setActiveSegment(categorySegments[category][0]);
  };

  const filteredProducts = networkSwitchProducts.filter((product) => {
    return product.category === activeCategory && product.segment === activeSegment;
  });

  return (
    <div className="min-h-screen mt-20 bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white py-12 shadow-md">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight mb-4 border-b-4 border-green-500 inline-block pb-1">
            Network Switches
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Explore our comprehensive range of network switches — from unmanaged to core switches.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 mt-10 space-y-8 flex flex-col items-center">
        <div className="flex flex-wrap justify-center gap-3">
          {Object.keys(categorySegments).map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-8 py-2.5 rounded-lg font-semibold transition-all duration-300 ${
                activeCategory === cat
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {categorySegments[activeCategory].length > 1 && (
          <div className="flex items-center gap-2 bg-gray-200/60 p-1.5 rounded-full border border-gray-300">
            {categorySegments[activeCategory].map((seg) => (
              <button
                key={seg}
                onClick={() => setActiveSegment(seg)}
                className={`px-10 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                  activeSegment === seg
                    ? 'bg-white text-green-700 shadow-md'
                    : 'text-gray-500'
                }`}
              >
                {seg}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto py-12 px-4 flex-grow">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block no-underline hover:no-underline"
              >
                <ProductCard product={product} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-3xl border border-dashed">
            <h3 className="text-xl font-bold text-gray-900">No products available in this category</h3>
          </div>
        )}
      </div>

      <RelatedProductsSection />
    </div>
  );
};

export default ProductCategoryPage;