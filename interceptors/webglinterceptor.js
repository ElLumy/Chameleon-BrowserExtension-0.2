/**
 * WebGL Interceptor
 * Spoofs WebGL parameters to match the generated profile
 * Ensures consistency with OS and hardware configuration
 */

(function() {
    'use strict';

    const WebGLInterceptor = {
        profile: null,
        parameterMap: null,
        
        init(profile) {
            this.profile = profile;
            this.buildParameterMap(profile);
            this.interceptWebGLContexts();
        },

        buildParameterMap(profile) {
            const gpu = profile.hardware?.gpu || {};
            const os = profile.os || {};
            
            // Build renderer and vendor strings based on OS and GPU
            let renderer = 'ANGLE (';
            let vendor = 'Google Inc.';
            
            if (os.name && os.name.includes('Windows')) {
                if (gpu.vendor === 'NVIDIA') {
                    renderer += `NVIDIA, ${gpu.model || 'NVIDIA GeForce RTX 3060'} Direct3D11 vs_5_0 ps_5_0, D3D11)`;
                } else if (gpu.vendor === 'AMD') {
                    renderer += `AMD, ${gpu.model || 'AMD Radeon RX 6600'} Direct3D11 vs_5_0 ps_5_0, D3D11)`;
                } else {
                    renderer += `Intel, ${gpu.model || 'Intel(R) UHD Graphics 620'} Direct3D11 vs_5_0 ps_5_0, D3D11)`;
                }
            } else if (os.name && os.name.includes('macOS')) {
                vendor = 'Apple Inc.';
                renderer = `ANGLE (Apple, ANGLE Metal Renderer: ${gpu.model || 'Apple M2'}, Unspecified Version)`;
            } else if (os.name && os.name.includes('Linux')) {
                if (gpu.vendor === 'Intel') {
                    renderer = `Mesa Intel(R) ${gpu.model || 'UHD Graphics 620'}`;
                } else if (gpu.vendor === 'NVIDIA') {
                    renderer = gpu.model || 'NVIDIA GeForce GTX 1650';
                } else {
                    renderer = `Mesa ${gpu.model || 'AMD Radeon Graphics'}`;
                }
            }

            // WebGL parameters to spoof
            this.parameterMap = new Map([
                // Vendor and Renderer
                [0x1F00, vendor], // VENDOR
                [0x1F01, renderer], // RENDERER
                [0x1F02, 'WebGL 1.0'], // VERSION
                [0x8B8C, 'WebGL GLSL ES 1.0'], // SHADING_LANGUAGE_VERSION
                
                // Extensions (as string)
                [0x1F03, this.generateExtensions(profile)], // EXTENSIONS
                
                // Integer parameters
                [0x0D33, 16384], // MAX_TEXTURE_SIZE
                [0x851C, 32], // MAX_VERTEX_TEXTURE_IMAGE_UNITS
                [0x8872, 16], // MAX_COMBINED_TEXTURE_IMAGE_UNITS
                [0x8B4D, 16], // MAX_FRAGMENT_UNIFORM_VECTORS
                [0x8B4C, 4096], // MAX_VERTEX_UNIFORM_VECTORS
                [0x8B4A, 30], // MAX_VARYING_VECTORS
                [0x8B49, 16], // MAX_VERTEX_ATTRIBS
                [0x84E8, 16], // MAX_TEXTURE_IMAGE_UNITS
                [0x8D57, 4096], // MAX_RENDERBUFFER_SIZE
                [0x851E, [16384, 16384]], // MAX_VIEWPORT_DIMS
                
                // Float parameters
                [0x846D, [1, 1024]], // ALIASED_LINE_WIDTH_RANGE
                [0x846E, [1, 255]], // ALIASED_POINT_SIZE_RANGE
                
                // WebGL2 specific
                [0x9122, 16], // MAX_TEXTURE_MAX_ANISOTROPY_EXT
                [0x8869, 256], // MAX_VERTEX_UNIFORM_COMPONENTS
                [0x8DFB, 1024], // MAX_FRAGMENT_UNIFORM_COMPONENTS
                [0x8A2B, 16], // MAX_UNIFORM_BUFFER_BINDINGS
                [0x8C2B, [32768, 32768]], // MAX_3D_TEXTURE_SIZE
                [0x8C89, 32], // MAX_COLOR_ATTACHMENTS
            ]);
        },

        generateExtensions(profile) {
            const baseExtensions = [
                'ANGLE_instanced_arrays',
                'EXT_blend_minmax',
                'EXT_color_buffer_half_float',
                'EXT_float_blend',
                'EXT_frag_depth',
                'EXT_shader_texture_lod',
                'EXT_texture_filter_anisotropic',
                'OES_element_index_uint',
                'OES_standard_derivatives',
                'OES_texture_float',
                'OES_texture_float_linear',
                'OES_texture_half_float',
                'OES_texture_half_float_linear',
                'OES_vertex_array_object',
                'WEBGL_color_buffer_float',
                'WEBGL_compressed_texture_s3tc',
                'WEBGL_debug_renderer_info',
                'WEBGL_debug_shaders',
                'WEBGL_depth_texture',
                'WEBGL_draw_buffers',
                'WEBGL_lose_context'
            ];
            
            // Add vendor-specific extensions
            const gpu = profile.hardware?.gpu || {};
            if (gpu.vendor === 'NVIDIA') {
                baseExtensions.push('WEBGL_compressed_texture_s3tc_srgb');
            }
            
            return baseExtensions.join(' ');
        },

        interceptWebGLContexts() {
            // Intercept both WebGL and WebGL2
            this.interceptContext('webgl');
            this.interceptContext('webgl2');
            this.interceptContext('experimental-webgl');
            this.interceptContext('experimental-webgl2');
        },

        interceptContext(contextType) {
            const original = HTMLCanvasElement.prototype.getContext;
            const self = this;
            
            HTMLCanvasElement.prototype.getContext = new Proxy(original, {
                apply(target, thisArg, args) {
                    const context = Reflect.apply(target, thisArg, args);
                    
                    if (context && args[0] && args[0].includes('webgl')) {
                        self.interceptGetParameter(context);
                        self.interceptGetExtension(context);
                        self.interceptGetSupportedExtensions(context);
                    }
                    
                    return context;
                }
            });
        },

        interceptGetParameter(context) {
            const original = context.getParameter;
            const self = this;
            
            context.getParameter = new Proxy(original, {
                apply(target, thisArg, args) {
                    const [parameter] = args;
                    
                    // Check if we have a spoofed value for this parameter
                    if (self.parameterMap.has(parameter)) {
                        // Add jitter to simulate real hardware behavior
                        return self.addJitter(() => self.parameterMap.get(parameter));
                    }
                    
                    // Fall back to original for unspoofed parameters
                    return Reflect.apply(target, thisArg, args);
                }
            });

            this.maskAsNative(context.getParameter, 'getParameter');
        },

        interceptGetExtension(context) {
            const original = context.getExtension;
            const self = this;
            
            context.getExtension = new Proxy(original, {
                apply(target, thisArg, args) {
                    const [name] = args;
                    
                    // Control which extensions are available based on profile
                    const allowedExtensions = self.parameterMap.get(0x1F03).split(' ');
                    
                    if (!allowedExtensions.includes(name)) {
                        return null;
                    }
                    
                    return Reflect.apply(target, thisArg, args);
                }
            });

            this.maskAsNative(context.getExtension, 'getExtension');
        },

        interceptGetSupportedExtensions(context) {
            const original = context.getSupportedExtensions;
            const self = this;
            
            context.getSupportedExtensions = new Proxy(original, {
                apply(target, thisArg, args) {
                    // Return our controlled list of extensions
                    const extensions = self.parameterMap.get(0x1F03).split(' ');
                    return self.addJitter(() => extensions);
                }
            });

            this.maskAsNative(context.getSupportedExtensions, 'getSupportedExtensions');
        },

        addJitter(callback) {
            // Add realistic timing jitter (1-3ms)
            const jitter = Math.random() * 2 + 1;
            const start = performance.now();
            
            while (performance.now() - start < jitter) {
                // Busy wait to simulate GPU processing time
            }
            
            return callback();
        },

        maskAsNative(func, name) {
            func.toString = function() {
                return `function ${name}() { [native code] }`;
            };
        }
    };

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = WebGLInterceptor;
    } else {
        window.WebGLInterceptor = WebGLInterceptor;
    }
})();