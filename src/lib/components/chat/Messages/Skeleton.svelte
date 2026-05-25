<script lang="ts">
	export let size = 'md';
</script>

<div class="gen-dots" class:gen-dots-sm={size === 'xs'} class:gen-dots-xs={size === 'xs'}>
	<span></span>
	<span></span>
	<span></span>
</div>

<style>
	.gen-dots {
		display: flex;
		gap: 5px;
		padding: 10px 2px;
	}
	.gen-dots span {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--accent);
		animation: genBounce 1.3s infinite ease-in-out both;
		opacity: 0.3;
	}
	.gen-dots span:nth-child(1) { animation-delay: -0.32s; }
	.gen-dots span:nth-child(2) { animation-delay: -0.16s; }
	.gen-dots-sm span {
		width: 3.5px;
		height: 3.5px;
		gap: 4px;
	}
	.gen-dots-xs span {
		width: 2.5px;
		height: 2.5px;
		gap: 3px;
	}
	@keyframes genBounce {
		0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
		40% { transform: scale(1); opacity: 1; }
	}
</style>
