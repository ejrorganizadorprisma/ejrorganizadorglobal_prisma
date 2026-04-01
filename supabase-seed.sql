--
-- PostgreSQL database dump
--

\restrict 5VJUihgmOGv5oEJ6pK58SSUsCr2M2m6mzWZZfGi1jQO7a2rXECd2bQ22XOBweZo

-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: backup_settings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.backup_settings VALUES ('d648f7ff-3c84-4112-8878-38367c86bd32', true, 'daily', '02:00', 1, 1, 30, 10, '2026-03-30 07:59:54.256835-03', '2026-03-31 02:00:00-03', '2026-03-30 01:56:58.24939-03', '2026-03-30 02:02:06.158924-03');


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.system_settings VALUES ('49f17b4a-965b-4357-9658-8e001f17553b', 'PY', 'PYG', 'es-PY', 0.186567, 1210.00, '{PYG,USD,BRL}', '2025-12-13 20:02:59.657334-03', '2026-03-31 11:46:08.964942-03', 6800.00);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users VALUES ('b2d343fc-80da-4c28-8495-f4959b4d8a8e', 'admin@ejr.com', '$2a$10$TPDqRNrnQe6w51pXn5jt5u/gSfvu6p88EqNBO9CcyBx/1VMUjYWEy', 'Administrador', 'OWNER', true, NULL, '2025-12-13 16:23:30.054', '2025-12-13 16:23:30.054');
INSERT INTO public.users VALUES ('b145172a-a903-46bf-b17b-62500bbf9208', 'owner@ejr.com', '$2a$10$LcNAphv5ifcqFc3jSShv..vm3vtTolBnV0oVu5D7t4G.UL.qd35B2', 'Owner', 'OWNER', true, NULL, '2025-12-13 16:23:30.178', '2025-12-13 16:23:30.178');
INSERT INTO public.users VALUES ('7d41d3b0-8498-4769-82e2-72517a2505cd', 'director@ejr.com', '$2a$10$F3Jf/hdSxxhIV18WxM4Zoed420pnBO0FtEb1KdS3c.3Bwju9LUZtO', 'Diretor', 'DIRECTOR', true, NULL, '2025-12-13 16:23:30.305', '2025-12-13 16:23:30.305');
INSERT INTO public.users VALUES ('90792a50-35ce-41c1-8cd3-ad555c5c0dd9', 'manager@ejr.com', '$2a$10$pzuB7bitGQ7PvCye46sgm.sueYwuT6Yf/whaaoNy6Ke5C7OrL8Roq', 'Gerente', 'MANAGER', true, NULL, '2025-12-13 16:23:30.427', '2025-12-13 16:23:30.427');
INSERT INTO public.users VALUES ('b78dda1d-2e4d-445c-bcd2-398a8425534c', 'salesperson@ejr.com', '$2a$10$2B1ZWoIsuMGIedvD.2DEmODSrXrnVO0PDvFMcKPJg60dRGBeD.d1y', 'Vendedor', 'SALESPERSON', true, NULL, '2025-12-13 16:23:30.55', '2025-12-13 16:23:30.55');
INSERT INTO public.users VALUES ('af4dd697-898d-440e-94b7-0516ab0a9376', 'stock@ejr.com', '$2a$10$KJpd7xAc/whriadcahHsC.Ez0s61uy2/FPKC7na94iKARwl636UQ.', 'Estoquista', 'STOCK', true, NULL, '2025-12-13 16:23:30.673', '2025-12-13 16:23:30.673');
INSERT INTO public.users VALUES ('7ce3ef05-371c-4338-a403-a9319190c7be', 'technician@ejr.com', '$2a$10$vtM3wz7lCCv6wREbgmqO5Oahre6Jim6si0xZBDrCh.75OzW6mkKzq', 'Técnico', 'TECHNICIAN', true, NULL, '2025-12-13 16:23:30.795', '2025-12-13 16:23:30.795');


--
-- PostgreSQL database dump complete
--

\unrestrict 5VJUihgmOGv5oEJ6pK58SSUsCr2M2m6mzWZZfGi1jQO7a2rXECd2bQ22XOBweZo

