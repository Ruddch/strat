'use client';

import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';

// Константы для типов отрисовки
const drawTypes = {
    FILL: 'fill',
    STROKE: 'stroke'
} as const;

const textAlignTypes = {
    LEFT: 'left',
    CENTER: 'center',
    RIGHT: 'right'
} as const;

const textBaselineTypes = {
    ALPHABETIC: 'alphabetic',
    MIDDLE: 'middle',
    TOP: 'top',
    BOTTOM: 'bottom'
} as const;

// Утилиты
const lerp = (start: number, end: number, factor: number): number => {
    return start + (end - start) * factor;
};

const dist = (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};

const angle = (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.atan2(y2 - y1, x2 - x1);
};

const rand = (max: number): number => {
    return Math.random() * max;
};

const pow = Math.pow;
const cos = Math.cos;
const sin = Math.sin;

// Класс для работы с массивами свойств частиц
class PropsArray {
    private data: Float32Array;
    private props: string[];
    private length: number;

    constructor(length: number, props: string[]) {
        this.length = length;
        this.props = props;
        this.data = new Float32Array(length * props.length);
    }

    forEach(callback: (props: number[], index: number) => void): void {
        for (let i = 0; i < this.length; i++) {
            const props: number[] = [];
            for (let j = 0; j < this.props.length; j++) {
                props.push(this.data[i * this.props.length + j]);
            }
            callback(props, i);
        }
    }

    set(values: number[], index: number): void {
        for (let i = 0; i < values.length; i++) {
            this.data[index * this.props.length + i] = values[i];
        }
    }
}


interface BackgroundEffectsProps {
    message?: string;
    fontSize?: number;
    fontColor?: [number, number, number, number];
    density?: number;
}

export function BackgroundEffects({ 
    message = 'PENGU STRATEGY',
    fontSize = 200,
    fontColor = [0, 152, 202, 51],
    density = 1
}: BackgroundEffectsProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | undefined>(undefined);
    const bufferRef = useRef<CanvasRenderingContext2D | undefined>(undefined);
    const ctxRef = useRef<CanvasRenderingContext2D | undefined>(undefined);
    const imageBufferRef = useRef<ImageData | undefined>(undefined);
    const particlesRef = useRef<PropsArray | undefined>(undefined);
    const hoverRef = useRef<boolean>(false);
    const userxRef = useRef<number>(0);
    const useryRef = useRef<number>(0);
    const repelxRef = useRef<number>(0);
    const repelyRef = useRef<number>(0);
    const centerxRef = useRef<number>(0);
    const centeryRef = useRef<number>(0);
    const widthRef = useRef<number>(0);
    const heightRef = useRef<number>(0);
    const [isMounted, setIsMounted] = useState(false);

    const options = useMemo(() => ({
        mouse: {
            lerpAmt: 0.5,
            repelThreshold: 100
        },
        particles: {
            density,
            get pixelDensity() {
                return (4 - this.density) * 4;
            },
            pLerpAmt: 0.25,
            vLerpAmt: 0.1
        },
        text: {
            drawType: drawTypes.FILL,
            fontColor,
            fontSize,
            get fontStyle() {
                return `${this.fontSize}px 'Oswald', 'Arial Black', Arial, sans-serif`;
            },
            message
        }
    }), [density, fontColor, fontSize, message]);

    const particleProps = useMemo(() => ['x', 'y', 'vx', 'vy', 'bx', 'by'], []);

    const setup = useCallback(() => {
        if (typeof window === 'undefined' || !canvasRef.current || !bufferRef.current || !ctxRef.current) return;

        const canvas = canvasRef.current;
        const buffer = bufferRef.current;
        const ctx = ctxRef.current;

        // Установка размеров
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        canvas.width = width;
        canvas.height = height;
        buffer.canvas.width = width;
        buffer.canvas.height = height;
        ctx.canvas.width = width;
        ctx.canvas.height = height;

        widthRef.current = width;
        heightRef.current = height;
        centerxRef.current = width * 0.5;
        centeryRef.current = height * 0.5;

        // Очистка буферов
        buffer.clearRect(0, 0, width, height);
        ctx.clearRect(0, 0, width, height);

        // Получаем CSS переменную шрифта
        const oswaldFont = getComputedStyle(document.documentElement)
            .getPropertyValue('--font-oswald')
            .trim();

        // Настройка стилей текста
        buffer.font = `${options.text.fontSize}px ${oswaldFont || "'Oswald'"}, Arial, sans-serif`;
        buffer.textBaseline = textBaselineTypes.MIDDLE;
        buffer.textAlign = textAlignTypes.CENTER;

        // Функция для создания частиц
        const createParticles = () => {
            // Создание изображения с текстом
            buffer.fillText(options.text.message, centerxRef.current, centeryRef.current);

            // Создание частиц из пикселей текста
            const pixelData = new Uint32Array(buffer.getImageData(0, 0, width, height).data);
            const pixels: number[] = [];

            for (let i = 0; i < pixelData.length; i += 4) {
                if (pixelData[i + 3] && !(i % options.particles.pixelDensity)) {
                    const x = rand(width) | 0;
                    const y = rand(height) | 0;
                    const bx = (i / 4) % width;
                    const by = ((i / 4) / width) | 0;
                    const vx = 0;
                    const vy = 0;

                    pixels.push(x, y, vx, vy, bx, by);
                }
            }

            particlesRef.current = new PropsArray(pixels.length / particleProps.length, particleProps);
            particlesRef.current.set(pixels, 0);
            imageBufferRef.current = buffer.createImageData(width, height);
        };

        // Проверяем, что шрифт загружен
        if (document.fonts) {
            document.fonts.ready.then(createParticles);
        } else {
            // Fallback для браузеров без Font Loading API
            createParticles();
        }
    }, [options, particleProps]);

    const update = useCallback(() => {
        if (!particlesRef.current) return;

        const hover = hoverRef.current;
        const userx = userxRef.current;
        const usery = useryRef.current;
        const centerx = centerxRef.current;
        const centery = centeryRef.current;

        if (hover) {
            repelxRef.current = lerp(repelxRef.current, userx, options.mouse.lerpAmt);
            repelyRef.current = lerp(repelyRef.current, usery, options.mouse.lerpAmt);
        } else {
            repelxRef.current = lerp(repelxRef.current, centerx, options.mouse.lerpAmt);
            repelyRef.current = lerp(repelyRef.current, centery, options.mouse.lerpAmt);
        }
    }, [options.mouse.lerpAmt]);

    const updatePixelCoords = useCallback((x: number, y: number, vx: number, vy: number, bx: number, by: number) => {
        const repelx = repelxRef.current;
        const repely = repelyRef.current;

        const rd = dist(x, y, repelx, repely);
        const phi = angle(repelx, repely, x, y);
        const f = (pow(options.mouse.repelThreshold, 2) / rd) * (rd / options.mouse.repelThreshold);

        const dx = bx - x;
        const dy = by - y;

        vx = lerp(vx, dx + (cos(phi) * f), options.particles.vLerpAmt);
        vy = lerp(vy, dy + (sin(phi) * f), options.particles.vLerpAmt);

        x = lerp(x, x + vx, options.particles.pLerpAmt);
        y = lerp(y, y + vy, options.particles.pLerpAmt);

        return [x, y, vx, vy];
    }, [options.mouse.repelThreshold, options.particles.vLerpAmt, options.particles.pLerpAmt]);

    const outOfBounds = useCallback((x: number, y: number, width: number, height: number) => {
        return x < 0 || x >= width || y < 0 || y >= height;
    }, []);

    const fillPixel = useCallback((imageData: ImageData, i: number, color: [number, number, number, number]) => {
        imageData.data.set(color, i);
    }, []);

    const drawParticles = useCallback(() => {
        if (!particlesRef.current || !imageBufferRef.current || !bufferRef.current) return;

        const particles = particlesRef.current;
        const imageBuffer = imageBufferRef.current;
        const buffer = bufferRef.current;
        const width = widthRef.current;
        const height = heightRef.current;

        imageBuffer.data.fill(0);

        particles.forEach(([x, y, vx, vy, bx, by], index) => {
            const _x = x | 0;
            const _y = y | 0;

            if (!outOfBounds(_x, _y, width, height)) {
                const i = 4 * (_x + _y * width);
                fillPixel(imageBuffer, i, options.text.fontColor);
            }

            particles.set(updatePixelCoords(x, y, vx, vy, bx, by), index);
        });

        buffer.putImageData(imageBuffer, 0, 0);
    }, [options.text.fontColor, outOfBounds, fillPixel, updatePixelCoords]);

    const renderFrame = useCallback(() => {
        if (!ctxRef.current || !bufferRef.current) return;

        const ctx = ctxRef.current;
        const buffer = bufferRef.current;

        ctx.save();
        ctx.filter = 'blur(8px) brightness(200%)';
        ctx.drawImage(buffer.canvas, 0, 0);
        ctx.filter = 'blur(0)';
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(buffer.canvas, 0, 0);
        ctx.restore();
    }, []);

    const render = useCallback(() => {
        if (!bufferRef.current || !ctxRef.current) return;

        const buffer = bufferRef.current;
        const ctx = ctxRef.current;

        buffer.clearRect(0, 0, widthRef.current, heightRef.current);
        ctx.clearRect(0, 0, widthRef.current, heightRef.current);
        drawParticles();
        renderFrame();
    }, [drawParticles, renderFrame]);

    const run = useCallback(() => {
        update();
        render();
        animationRef.current = requestAnimationFrame(run);
    }, [update, render]);

    const handleMouseMove = useCallback((event: MouseEvent) => {
        hoverRef.current = true;
        userxRef.current = event.clientX;
        useryRef.current = event.clientY;
    }, []);

    const handleMouseOut = useCallback(() => {
        hoverRef.current = false;
    }, []);

    const handleResize = useCallback(() => {
        setup();
    }, [setup]);

    useEffect(() => {
        // Устанавливаем флаг монтирования на клиенте
        setIsMounted(true);
    }, []);

    useEffect(() => {
        // Проверяем, что мы на клиенте и компонент смонтирован
        if (!isMounted || typeof window === 'undefined' || !canvasRef.current) return;

        const canvas = canvasRef.current;
        bufferRef.current = canvas.getContext('2d')!;
        ctxRef.current = canvas.getContext('2d')!;

        setup();
        run();

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseout', handleMouseOut);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseout', handleMouseOut);
        };
    }, [isMounted, setup, run, handleResize, handleMouseMove, handleMouseOut]);

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    backgroundColor: 'black'
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 152, 202, 0.2)',
                    pointerEvents: 'none'
                }}
            />
        </div>
    );
} 