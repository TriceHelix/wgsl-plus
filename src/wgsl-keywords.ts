
const wgslKeywords = new Set([
	"array", "atomic", "bool", "f32", "f16", "i32", "mat2x2", "mat2x3", "mat2x4",
	"mat3x2", "mat3x3", "mat3x4", "mat4x2", "mat4x3", "mat4x4", "ptr", "sampler",
	"sampler_comparison", "texture_1d", "texture_2d", "texture_2d_array", "texture_3d",
	"texture_cube", "texture_cube_array", "texture_multisampled_2d", "texture_storage_1d",
	"texture_storage_2d", "texture_storage_2d_array", "texture_storage_3d", "u32",
	"vec2", "vec3", "vec4",
	"alias", "bitcast", "break", "case", "const", "continue", "continuing", "default",
	"discard", "else", "enable", "false", "fn", "for", "if", "let", "loop", "return",
	"struct", "switch", "true", "type", "var", "while",
]);

export default wgslKeywords;