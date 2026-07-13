<script lang="ts">
	/*
	 * THE PRESS — the FOLIO settings leaf.
	 *
	 * Settings as a single loose leaf laid over the desk: one quiet column,
	 * no tabs, no search, no Save buttons. Every change takes hold the moment
	 * it is made (a small "recorded" stamp confirms it); destructive acts arm
	 * on first click and strike on the second. Replaces SettingsModal.
	 */
	import { getContext, tick } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { quartOut } from 'svelte/easing';
	import { goto } from '$app/navigation';
	// @ts-expect-error — file-saver ships without type declarations
	import fileSaver from 'file-saver';
	const { saveAs } = fileSaver;

	import {
		chats,
		config,
		currentChatPage,
		models,
		pinnedChats,
		scrollPaginationEnabled,
		settings,
		theme,
		user
	} from '$lib/stores';
	import { getLanguages, changeLanguage } from '$lib/i18n';
	import { updateUserSettings } from '$lib/apis/users';
	import { userSignOut, updateUserProfile, getSessionUser } from '$lib/apis/auths';
	import {
		archiveAllChats,
		deleteAllChats,
		getAllChats,
		getChatList,
		getPinnedChatList,
		unarchiveAllChats
	} from '$lib/apis/chats';
	import {
		addNewMemory,
		deleteMemoryById,
		getMemories,
		updateMemoryById
	} from '$lib/apis/memories';
	import { inlineError } from '$lib/utils/inlineError';
	import { WEBUI_VERSION } from '$lib/constants';

	import type { Writable } from 'svelte/store';
	const i18n = getContext('i18n') as Writable<any>;

	export let show: boolean | string = false;

	// Old call sites open specific tabs by string — map them onto the leaf's sections.
	const sectionForTab: Record<string, string> = {
		general: 'hand',
		interface: 'desk',
		tools: 'type',
		connections: 'type',
		memory: 'commonplace',
		archived_chats: 'records',
		data_controls: 'records'
	};
	let pendingSection: string | null = null;

	let leafEl: HTMLElement;

	// ─── local state, snapshotted from the stores on open ───
	let name = '';
	let themeChoice = 'system';
	let lang = 'en-US';
	let languages: { code: string; title: string }[] = [];
	let notificationEnabled = false;
	let notificationSound = true;
	let wideFolio = false;
	let dropCaps = true;
	let ctrlEnterToSend = false;
	let titleAuto = true;
	let autoFollowUps = true;
	let defaultModelId = '';
	let system = '';
	let enableMemory = false;
	let memories: any[] = [];
	let memoriesLoaded = false;

	let wasOpen = false;
	$: if (show) {
		openHandler();
	} else {
		wasOpen = false;
	}

	const openHandler = async () => {
		if (typeof show === 'string') {
			pendingSection = sectionForTab[show] ?? null;
			show = true; // normalize the store; keep going — the $: block won't re-fire
		}
		if (wasOpen) return;
		wasOpen = true;

		name = $user?.name ?? '';
		themeChoice = localStorage.theme === 'oled-dark' ? 'dark' : (localStorage.theme ?? 'system');
		lang = $i18n.language;
		notificationEnabled = $settings?.notificationEnabled ?? false;
		notificationSound = $settings?.notificationSound ?? true;
		wideFolio = $settings?.wideFolio ?? false;
		dropCaps = $settings?.dropCaps ?? true;
		ctrlEnterToSend = $settings?.ctrlEnterToSend ?? false;
		titleAuto = $settings?.title?.auto ?? true;
		autoFollowUps = $settings?.autoFollowUps ?? true;
		defaultModelId = $settings?.models?.at(0) ?? '';
		system = $settings?.system ?? '';
		enableMemory = $settings?.memory ?? false;
		armed = null;
		stamps = {};

		getLanguages().then((l) => (languages = l));
		if (enableMemory) loadMemories();

		await tick();
		if (pendingSection) {
			// scroll the leaf directly once the fly-in has settled — scrollIntoView
			// mid-transition gets swallowed by the transform
			const section = pendingSection;
			pendingSection = null;
			setTimeout(() => {
				const sec = document.getElementById(`press-${section}`);
				const scroller = leafEl?.querySelector('.press-scroll');
				if (sec && scroller) scroller.scrollTop = sec.offsetTop - 18;
			}, 500);
		}
	};

	const close = () => {
		show = false;
	};

	// ─── the "recorded" stamp — autosave's quiet confirmation ───
	let stamps: Record<string, number> = {};
	const stamp = (key: string) => {
		stamps = { ...stamps, [key]: Date.now() };
		setTimeout(() => {
			const { [key]: _, ...rest } = stamps;
			stamps = rest;
		}, 1900);
	};

	const saveSettings = async (updated: object, stampKey: string | null = null) => {
		settings.set({ ...$settings, ...updated });
		await updateUserSettings(localStorage.token, { ui: $settings });
		if (stampKey) stamp(stampKey);
	};

	// ─── the hand ───
	const saveName = async (e: FocusEvent | KeyboardEvent) => {
		const el = e.currentTarget as HTMLInputElement;
		const next = name.trim();
		if (next === '' || next === $user?.name) {
			name = $user?.name ?? '';
			return;
		}
		const me = $user as any;
		const updated = await updateUserProfile(localStorage.token, {
			name: next,
			profile_image_url: me?.profile_image_url ?? '',
			bio: me?.bio ?? null,
			gender: me?.gender ?? null,
			date_of_birth: me?.date_of_birth ?? null
		}).catch((error) => {
			inlineError(el, `${error}`);
			return null;
		});
		if (updated) {
			user.set(await getSessionUser(localStorage.token).catch(() => $user));
			stamp('name');
		}
	};

	// ─── the lamp — theme ripple, same gesture as the letterhead's lamp ───
	const setTheme = (next: string, e: MouseEvent) => {
		if (next === themeChoice) return;
		themeChoice = next;
		const root = document.documentElement;
		const resolved =
			next === 'system'
				? window.matchMedia('(prefers-color-scheme: dark)').matches
					? 'dark'
					: 'light'
				: next;

		const target = e.currentTarget as HTMLElement;
		const rect = target?.getBoundingClientRect();
		const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
		const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
		const maxR = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
		const oldBg = getComputedStyle(root).getPropertyValue('--bg-base').trim() || '#f5f1e8';
		const gradient = `radial-gradient(circle var(--reveal-r) at ${x}px ${y}px, transparent 99.9%, black 100%)`;
		const overlay = document.createElement('div');
		overlay.style.cssText = `position:fixed;inset:0;z-index:9999;pointer-events:none;background:${oldBg};--reveal-r:0px;mask-image:${gradient};-webkit-mask-image:${gradient}`;
		document.body.appendChild(overlay);

		localStorage.setItem('theme', next);
		theme.set(next);
		['dark', 'light', 'oled-dark'].forEach((c) => root.classList.remove(c));
		root.classList.add(resolved);

		overlay
			.animate([{ '--reveal-r': '0px' }, { '--reveal-r': `${maxR}px` }], {
				duration: 600,
				easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
			})
			.finished.then(() => overlay.remove())
			.catch(() => overlay.remove());
	};

	const setLanguage = (e: Event) => {
		changeLanguage(lang);
		stamp('lang');
	};

	const toggleNotifications = async (e: MouseEvent) => {
		const el = e.currentTarget as HTMLElement;
		if (notificationEnabled) {
			notificationEnabled = false;
			saveSettings({ notificationEnabled: false }, 'notify');
			return;
		}
		if (!('Notification' in window)) {
			inlineError(el, 'This browser does not support notifications.');
			return;
		}
		const permission = await Notification.requestPermission();
		if (permission === 'granted') {
			notificationEnabled = true;
			saveSettings({ notificationEnabled: true }, 'notify');
		} else {
			inlineError(el, 'Notification permission was denied — allow it in your browser settings.');
		}
	};

	// ─── the type ───
	const saveDefaultModel = () => {
		saveSettings({ models: [defaultModelId] }, 'model');
	};

	const saveSystem = () => {
		if ((system ?? '') === ($settings?.system ?? '')) return;
		saveSettings({ system: system !== '' ? system : undefined }, 'system');
	};

	// ─── the commonplace book (memory) ───
	const loadMemories = async () => {
		memories = (await getMemories(localStorage.token).catch(() => [])) ?? [];
		memoriesLoaded = true;
	};

	const toggleMemory = () => {
		enableMemory = !enableMemory;
		saveSettings({ memory: enableMemory }, 'memory');
		if (enableMemory && !memoriesLoaded) loadMemories();
	};

	let newMemory = '';
	const addMemory = async (e: KeyboardEvent) => {
		if (e.key !== 'Enter' || newMemory.trim() === '') return;
		const el = e.currentTarget as HTMLInputElement;
		const res = await addNewMemory(localStorage.token, newMemory.trim()).catch((error) => {
			inlineError(el, `${error}`);
			return null;
		});
		if (res) {
			memories = [res, ...memories];
			newMemory = '';
			stamp('memory');
		}
	};

	let editingMemoryId: string | null = null;
	let memoryDraft = '';
	const beginMemoryEdit = async (m: any) => {
		editingMemoryId = m.id;
		memoryDraft = m.content;
		await tick();
		leafEl?.querySelector<HTMLTextAreaElement>('.mem-edit')?.focus();
	};
	const commitMemoryEdit = async (m: any) => {
		const content = memoryDraft.trim();
		editingMemoryId = null;
		if (content === '' || content === m.content) return;
		const res = await updateMemoryById(localStorage.token, m.id, content).catch(() => null);
		if (res) {
			memories = memories.map((x) => (x.id === m.id ? { ...x, content } : x));
			stamp('memory');
		}
	};

	// ─── two-step arming for anything that destroys ───
	let armed: string | null = null;
	let armTimer: ReturnType<typeof setTimeout>;
	const armThen = (key: string, fn: () => void) => {
		clearTimeout(armTimer);
		if (armed === key) {
			armed = null;
			fn();
		} else {
			armed = key;
			armTimer = setTimeout(() => (armed = null), 4000);
		}
	};

	const deleteMemory = (m: any) => {
		armThen(`mem-${m.id}`, async () => {
			const res = await deleteMemoryById(localStorage.token, m.id).catch(() => null);
			if (res) memories = memories.filter((x) => x.id !== m.id);
		});
	};

	// ─── the records ───
	const refreshChats = async () => {
		currentChatPage.set(1);
		await chats.set(await getChatList(localStorage.token, $currentChatPage));
		pinnedChats.set(await getPinnedChatList(localStorage.token).catch(() => []));
		scrollPaginationEnabled.set(true);
	};

	const exportArchive = async (e: MouseEvent) => {
		const el = e.currentTarget as HTMLElement;
		const all = await getAllChats(localStorage.token).catch((error) => {
			inlineError(el, `${error}`);
			return null;
		});
		if (all) {
			saveAs(
				new Blob([JSON.stringify(all)], { type: 'application/json' }),
				`folio-archive-${Date.now()}.json`
			);
			stamp('records');
		}
	};

	const returnArchived = async (e: MouseEvent) => {
		const el = e.currentTarget as HTMLElement;
		const res = await unarchiveAllChats(localStorage.token).catch((error) => {
			inlineError(el, `${error}`);
			return null;
		});
		if (res !== null) {
			await refreshChats();
			stamp('records');
		}
	};

	const archiveEverything = () =>
		armThen('archive-all', async () => {
			await goto('/');
			await archiveAllChats(localStorage.token).catch(() => {});
			await refreshChats();
			stamp('records');
		});

	const burnEverything = () =>
		armThen('burn-all', async () => {
			await goto('/');
			await deleteAllChats(localStorage.token).catch(() => {});
			await refreshChats();
			stamp('records');
		});

	// ─── colophon ───
	const signOut = async () => {
		const res = await userSignOut();
		user.set(undefined);
		localStorage.removeItem('token');
		show = false;
		location.href = res?.redirect_url ?? '/auth';
	};

	const toAdmin = async () => {
		await goto('/admin');
		show = false;
	};

	const onKeydown = (e: KeyboardEvent) => {
		if (show && e.key === 'Escape') {
			e.stopPropagation();
			close();
		}
	};
</script>

<svelte:window on:keydown={onKeydown} />

{#if show}
	<div class="press-veil" transition:fade={{ duration: 240 }}>
		<button class="press-scrim" aria-label="Close settings" on:click={close}></button>

		<div
			class="press"
			role="dialog"
			aria-modal="true"
			aria-label="Settings"
			bind:this={leafEl}
			transition:fly={{ y: 28, duration: 460, easing: quartOut }}
		>
			<button class="press-x" aria-label="Close settings" on:click={close}>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg
				>
			</button>

			<div class="press-scroll">
				<header class="press-head">
					<div class="press-kicker">Folio</div>
					<h2 class="press-title">Settings</h2>
					<p class="press-note">Every change is saved automatically, as you make it.</p>
					<div class="press-asterism" aria-hidden="true">⁂</div>
				</header>

				<!-- i · account -->
				<section class="press-sec" id="press-hand" aria-label="Account">
					<h3 class="sec-kicker"><span class="sec-no">i</span>Account</h3>

					<div class="press-row">
						<span class="row-label">
							Name
							{#if stamps.name}<span class="stamp">saved</span>{/if}
							<span class="row-hint">shown on your messages and in the sidebar</span>
						</span>
						<input
							class="inline-input"
							bind:value={name}
							spellcheck="false"
							on:blur={saveName}
							on:keydown={(e) => {
								if (e.key === 'Enter') e.currentTarget.blur();
							}}
						/>
					</div>

					<div class="press-row">
						<span class="row-label">
							Email
							<span class="row-hint">your sign-in address</span>
						</span>
						<span class="row-value">{$user?.email ?? ''}</span>
					</div>
				</section>

				<!-- ii · appearance -->
				<section class="press-sec" id="press-desk" aria-label="Appearance">
					<h3 class="sec-kicker"><span class="sec-no">ii</span>Appearance</h3>

					<div class="press-row">
						<span class="row-label">
							Theme
							<span class="row-hint">system follows your device's light and dark mode</span>
						</span>
						<span class="choices" role="radiogroup" aria-label="Theme">
							{#each [['light', 'light'], ['dark', 'dark'], ['system', 'system']] as [value, label]}
								<button
									class="choice"
									class:on={themeChoice === value}
									role="radio"
									aria-checked={themeChoice === value}
									on:click={(e) => setTheme(value, e)}>{label}</button
								>
							{/each}
						</span>
					</div>

					<div class="press-row">
						<span class="row-label">
							Page width
							{#if stamps.width}<span class="stamp">saved</span>{/if}
							<span class="row-hint">how wide the conversation column runs</span>
						</span>
						<span class="choices" role="radiogroup" aria-label="Page width">
							<button
								class="choice"
								class:on={!wideFolio}
								role="radio"
								aria-checked={!wideFolio}
								on:click={() => {
									wideFolio = false;
									saveSettings({ wideFolio }, 'width');
								}}>comfortable</button
							>
							<button
								class="choice"
								class:on={wideFolio}
								role="radio"
								aria-checked={wideFolio}
								on:click={() => {
									wideFolio = true;
									saveSettings({ wideFolio }, 'width');
								}}>wide</button
							>
						</span>
					</div>

					<div class="press-row">
						<span class="row-label">
							Drop caps
							{#if stamps.dropcaps}<span class="stamp">saved</span>{/if}
							<span class="row-hint">a large illuminated first letter on each conversation's opening reply</span>
						</span>
						<button
							class="tgl"
							class:on={dropCaps}
							role="switch"
							aria-checked={dropCaps}
							aria-label="Drop caps"
							on:click={() => {
								dropCaps = !dropCaps;
								saveSettings({ dropCaps }, 'dropcaps');
							}}
						>
							<span class="tgl-dot"></span>
						</button>
					</div>

					<div class="press-row">
						<span class="row-label">
							Language
							{#if stamps.lang}<span class="stamp">saved</span>{/if}
							<span class="row-hint">for the interface, not the conversation</span>
						</span>
						<span class="sel">
							<select bind:value={lang} on:change={setLanguage} aria-label="Language">
								{#each languages as l}
									<option value={l.code}>{l.title}</option>
								{/each}
							</select>
							<svg
								width="10"
								height="10"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg
							>
						</span>
					</div>

					<div class="press-row">
						<span class="row-label">
							Notifications
							{#if stamps.notify}<span class="stamp">saved</span>{/if}
							<span class="row-hint">notify you when a response finishes in the background</span>
						</span>
						<button
							class="tgl"
							class:on={notificationEnabled}
							role="switch"
							aria-checked={notificationEnabled}
							aria-label="Notifications"
							on:click={toggleNotifications}
						>
							<span class="tgl-dot"></span>
						</button>
					</div>

					<div class="press-row">
						<span class="row-label">
							Notification sound
							{#if stamps.sound}<span class="stamp">saved</span>{/if}
							<span class="row-hint">play a chime with the notification</span>
						</span>
						<button
							class="tgl"
							class:on={notificationSound}
							role="switch"
							aria-checked={notificationSound}
							aria-label="Notification sound"
							on:click={() => {
								notificationSound = !notificationSound;
								saveSettings({ notificationSound }, 'sound');
							}}
						>
							<span class="tgl-dot"></span>
						</button>
					</div>
				</section>

				<!-- iii · chat -->
				<section class="press-sec" id="press-type" aria-label="Chat">
					<h3 class="sec-kicker"><span class="sec-no">iii</span>Chat</h3>

					<div class="press-row">
						<span class="row-label">
							Default model
							{#if stamps.model}<span class="stamp">saved</span>{/if}
							<span class="row-hint">used when a new chat doesn't pick one</span>
						</span>
						<span class="sel">
							<select bind:value={defaultModelId} on:change={saveDefaultModel} aria-label="Default model">
								<option value="">server default</option>
								{#each $models.filter((m) => m?.name) as model}
									<option value={model.id}>{model.name}</option>
								{/each}
							</select>
							<svg
								width="10"
								height="10"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg
							>
						</span>
					</div>

					<div class="press-row press-row-block">
						<span class="row-label">
							System prompt
							{#if stamps.system}<span class="stamp">saved</span>{/if}
							<span class="row-hint">sent to the model at the start of every conversation</span>
						</span>
						<textarea
							class="ruled"
							rows="3"
							spellcheck="false"
							placeholder="Leave empty for none…"
							bind:value={system}
							on:blur={saveSystem}
						></textarea>
					</div>

					<div class="press-row">
						<span class="row-label">
							Send with
							{#if stamps.send}<span class="stamp">saved</span>{/if}
							<span class="row-hint">the other combination inserts a new line</span>
						</span>
						<span class="choices" role="radiogroup" aria-label="Send with">
							<button
								class="choice"
								class:on={!ctrlEnterToSend}
								role="radio"
								aria-checked={!ctrlEnterToSend}
								on:click={() => {
									ctrlEnterToSend = false;
									saveSettings({ ctrlEnterToSend }, 'send');
								}}>enter</button
							>
							<button
								class="choice"
								class:on={ctrlEnterToSend}
								role="radio"
								aria-checked={ctrlEnterToSend}
								on:click={() => {
									ctrlEnterToSend = true;
									saveSettings({ ctrlEnterToSend }, 'send');
								}}>ctrl+enter</button
							>
						</span>
					</div>

					<div class="press-row">
						<span class="row-label">
							Auto-title chats
							{#if stamps.autotitle}<span class="stamp">saved</span>{/if}
							<span class="row-hint">name new chats from their first exchange</span>
						</span>
						<button
							class="tgl"
							class:on={titleAuto}
							role="switch"
							aria-checked={titleAuto}
							aria-label="Auto-title chats"
							on:click={() => {
								titleAuto = !titleAuto;
								saveSettings({ title: { ...($settings?.title ?? {}), auto: titleAuto } }, 'autotitle');
							}}
						>
							<span class="tgl-dot"></span>
						</button>
					</div>

					<div class="press-row">
						<span class="row-label">
							Follow-up suggestions
							{#if stamps.followups}<span class="stamp">saved</span>{/if}
							<span class="row-hint">suggested next questions, written into the margin notes</span>
						</span>
						<button
							class="tgl"
							class:on={autoFollowUps}
							role="switch"
							aria-checked={autoFollowUps}
							aria-label="Follow-up suggestions"
							on:click={() => {
								autoFollowUps = !autoFollowUps;
								saveSettings({ autoFollowUps }, 'followups');
							}}
						>
							<span class="tgl-dot"></span>
						</button>
					</div>
				</section>

				<!-- iv · memory -->
				<section class="press-sec" id="press-commonplace" aria-label="Memory">
					<h3 class="sec-kicker"><span class="sec-no">iv</span>Memory</h3>

					<div class="press-row">
						<span class="row-label">
							Enable memory
							{#if stamps.memory}<span class="stamp">saved</span>{/if}
							<span class="row-hint">small facts about you, remembered across chats</span>
						</span>
						<button
							class="tgl"
							class:on={enableMemory}
							role="switch"
							aria-checked={enableMemory}
							aria-label="Memory"
							on:click={toggleMemory}
						>
							<span class="tgl-dot"></span>
						</button>
					</div>

					{#if enableMemory}
						<div class="mem-book">
							<input
								class="mem-add"
								placeholder="Add a memory, then press Enter…"
								bind:value={newMemory}
								on:keydown={addMemory}
							/>
							{#each memories as m (m.id)}
								<div class="mem">
									{#if editingMemoryId === m.id}
										<textarea
											class="mem-edit"
											rows="2"
											bind:value={memoryDraft}
											on:blur={() => commitMemoryEdit(m)}
											on:keydown={(e) => {
												if (e.key === 'Enter' && !e.shiftKey) e.currentTarget.blur();
											}}
										></textarea>
									{:else}
										<button class="mem-text" title="Edit" on:click={() => beginMemoryEdit(m)}>
											{m.content}
										</button>
									{/if}
									<button
										class="mem-x"
										class:armed={armed === `mem-${m.id}`}
										aria-label="Delete this memory"
										on:click={() => deleteMemory(m)}
									>
										{#if armed === `mem-${m.id}`}
											<span class="mem-sure">sure?</span>
										{:else}
											<svg
												width="11"
												height="11"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="1.8"
												stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg
											>
										{/if}
									</button>
								</div>
							{:else}
								<p class="mem-empty">Nothing remembered yet.</p>
							{/each}
						</div>
					{/if}
				</section>

				<!-- v · chat history -->
				<section class="press-sec" id="press-records" aria-label="Chat history">
					<h3 class="sec-kicker">
						<span class="sec-no">v</span>Chat History
						{#if stamps.records}<span class="stamp">done</span>{/if}
					</h3>

					<button class="act" on:click={exportArchive}>
						<span>Export all chats</span>
						<span class="act-meta">one json file</span>
						<svg
							class="act-arrow"
							width="11"
							height="11"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg
						>
					</button>

					<button class="act" on:click={returnArchived}>
						<span>Unarchive all chats</span>
						<span class="act-meta">bring archived chats back to the list</span>
						<svg
							class="act-arrow"
							width="11"
							height="11"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg
						>
					</button>

					<button class="act danger" class:armed={armed === 'archive-all'} on:click={archiveEverything}>
						{#if armed === 'archive-all'}
							<span>Click again to archive all chats</span>
						{:else}
							<span>Archive all chats</span>
							<span class="act-meta">clears the list, nothing is deleted</span>
						{/if}
					</button>

					<button class="act danger" class:armed={armed === 'burn-all'} on:click={burnEverything}>
						{#if armed === 'burn-all'}
							<span>This cannot be undone — click again to delete everything</span>
						{:else}
							<span>Delete all chats</span>
							<span class="act-meta">permanent</span>
						{/if}
					</button>
				</section>

				<!-- colophon -->
				<footer class="press-colophon">
					<div class="press-asterism" aria-hidden="true">⁂</div>
					<p class="colo-line">
						FOLIO · an independent fork of Open WebUI · v{WEBUI_VERSION}
					</p>
					<div class="colo-links">
						{#if $user?.role === 'admin'}
							<button class="colo-link" on:click={toAdmin}>Admin panel →</button>
						{/if}
						<button class="colo-link leave" on:click={signOut}>Sign out →</button>
					</div>
				</footer>
			</div>
		</div>
	</div>
{/if}

<style>
	.press-veil {
		position: fixed;
		inset: 0;
		z-index: 999;
		display: grid;
		place-items: center;
		padding: 18px;
	}
	.press-scrim {
		position: absolute;
		inset: 0;
		background: rgba(14, 10, 6, 0.42);
		backdrop-filter: blur(2px);
		-webkit-backdrop-filter: blur(2px);
		cursor: default;
	}

	/* ── the leaf ── */
	.press {
		position: relative;
		width: min(680px, 100%);
		height: min(820px, 100%);
		display: flex;
		flex-direction: column;
		background: var(--paper);
		color: var(--ink);
		border: 1px solid var(--rule);
		border-radius: 24px;
		box-shadow: 0 48px 110px -48px rgba(0, 0, 0, 0.55);
		overflow: hidden;
	}

	.press-x {
		position: absolute;
		top: 16px;
		right: 16px;
		z-index: 2;
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		color: var(--ink-3);
		background: transparent;
		transition:
			color 0.2s,
			background 0.2s,
			transform 0.25s var(--spring);
	}
	.press-x:hover {
		color: var(--ink);
		background: color-mix(in srgb, var(--ink) 6%, transparent);
		transform: rotate(90deg);
	}

	.press-scroll {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: clamp(34px, 7vh, 58px) clamp(26px, 6vw, 62px) 44px;
		scrollbar-width: thin;
		scrollbar-color: var(--rule) transparent;
	}

	/* ── letterhead ── */
	.press-head {
		text-align: center;
		margin-bottom: 14px;
	}
	.press-kicker {
		font-family: var(--mono);
		font-size: 10.5px;
		font-weight: 650;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		color: var(--ink-3);
	}
	.press-title {
		margin: 12px 0 0;
		font-family: var(--serif);
		font-size: clamp(25px, 4vw, 30px);
		font-weight: 400;
		line-height: 1.15;
		color: var(--ink);
	}
	.press-note {
		margin: 10px auto 0;
		max-width: 40ch;
		font-family: var(--serif);
		font-style: italic;
		font-size: 13.5px;
		line-height: 1.5;
		color: var(--ink-3);
	}
	.press-asterism {
		margin-top: 16px;
		font-size: 13px;
		letter-spacing: 0.5em;
		color: var(--ink-3);
	}

	/* ── sections ── */
	.press-sec {
		margin-top: 40px;
	}
	.sec-kicker {
		display: flex;
		align-items: baseline;
		gap: 10px;
		margin: 0 0 4px;
		font-family: var(--mono);
		font-size: 10.5px;
		font-weight: 650;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-2);
	}
	.sec-no {
		color: var(--vermilion);
		font-weight: 500;
	}
	.sec-kicker::after {
		content: '';
		flex: 1;
		align-self: center;
		height: 1px;
		background: var(--rule-faint);
	}

	/* ── ruled setting lines ── */
	.press-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 20px;
		padding: 15px 2px;
		border-bottom: 1px solid var(--rule-faint);
	}
	.press-row-block {
		flex-direction: column;
		align-items: stretch;
		gap: 12px;
	}
	.row-label {
		font-family: var(--serif);
		font-size: 15px;
		color: var(--ink);
	}
	.row-hint {
		display: block;
		margin-top: 3px;
		max-width: 36ch;
		font-style: italic;
		font-size: 12.5px;
		line-height: 1.45;
		color: var(--ink-3);
	}
	.row-value {
		font-family: var(--mono);
		font-size: 11.5px;
		color: var(--ink-2);
		overflow-wrap: anywhere;
		text-align: right;
	}

	/* the recorded stamp — autosave's only ceremony */
	.stamp {
		display: inline-block;
		margin-left: 9px;
		font-family: var(--mono);
		font-style: normal;
		font-size: 9.5px;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--ok);
		animation: stampFade 1.9s var(--out) forwards;
	}
	@keyframes stampFade {
		0% {
			opacity: 0;
			transform: translateY(2px);
		}
		12% {
			opacity: 1;
			transform: none;
		}
		72% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}

	/* ── controls ── */
	.inline-input {
		flex: 1;
		min-width: 0;
		max-width: 240px;
		font-family: var(--serif);
		font-size: 15px;
		color: var(--ink);
		text-align: right;
		background: transparent;
		border: none;
		border-bottom: 1px dashed transparent;
		outline: none;
		padding: 0 1px 2px;
		caret-color: var(--vermilion);
		transition: border-color 0.2s;
	}
	.inline-input:hover,
	.inline-input:focus {
		border-bottom-color: var(--rule);
	}

	.choices {
		display: flex;
		gap: 3px;
		flex: none;
	}
	.choice {
		font-family: var(--mono);
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.13em;
		text-transform: uppercase;
		color: var(--ink-3);
		padding: 6px 9px;
		border-radius: 8px;
		background: transparent;
		white-space: nowrap;
		transition:
			color 0.18s,
			background 0.18s;
	}
	.choice:hover {
		color: var(--ink);
		background: color-mix(in srgb, var(--ink) 5%, transparent);
	}
	.choice.on {
		color: var(--vermilion);
		background: var(--vermilion-soft);
	}

	.sel {
		position: relative;
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--ink-3);
		flex: none;
		max-width: 55%;
	}
	.sel select {
		appearance: none;
		-webkit-appearance: none;
		max-width: 100%;
		font-family: var(--serif);
		font-size: 14px;
		color: var(--ink);
		text-align: right;
		background: transparent;
		border: none;
		border-bottom: 1px dashed transparent;
		outline: none;
		padding: 0 0 2px;
		cursor: pointer;
		direction: rtl;
		text-overflow: ellipsis;
		transition: border-color 0.2s;
	}
	.sel select option {
		direction: ltr;
		background: var(--paper);
		color: var(--ink);
	}
	.sel:hover select,
	.sel select:focus {
		border-bottom-color: var(--rule);
	}

	/* the ink dot slides along its rule */
	.tgl {
		position: relative;
		flex: none;
		width: 38px;
		height: 22px;
		align-self: center;
		background: transparent;
		cursor: pointer;
	}
	.tgl::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: 1.5px;
		margin-top: -0.75px;
		border-radius: 2px;
		background: var(--rule);
		transition: background 0.25s;
	}
	.tgl-dot {
		position: absolute;
		top: 50%;
		left: 0;
		width: 11px;
		height: 11px;
		margin-top: -5.5px;
		border-radius: 50%;
		border: 1.5px solid var(--ink-3);
		background: var(--paper);
		transition:
			left 0.32s var(--spring),
			border-color 0.22s,
			background 0.22s;
	}
	.tgl:hover .tgl-dot {
		border-color: var(--ink);
	}
	.tgl.on::before {
		background: color-mix(in srgb, var(--vermilion) 50%, var(--rule));
	}
	.tgl.on .tgl-dot {
		left: calc(100% - 11px);
		border-color: var(--vermilion);
		background: var(--vermilion);
	}

	/* standing instructions — a small ruled sheet */
	.ruled {
		width: 100%;
		min-height: 87px;
		resize: vertical;
		background: repeating-linear-gradient(
			transparent,
			transparent 28px,
			var(--rule-faint) 28px,
			var(--rule-faint) 29px
		);
		font-family: var(--body);
		font-size: 13.5px;
		line-height: 29px;
		color: var(--ink);
		border: none;
		outline: none;
		padding: 0 2px;
		caret-color: var(--vermilion);
	}
	.ruled::placeholder {
		font-family: var(--serif);
		font-style: italic;
		color: var(--ink-3);
	}

	/* ── the commonplace book ── */
	.mem-book {
		padding: 4px 2px 0;
	}
	.mem-add {
		width: 100%;
		padding: 11px 2px;
		font-family: var(--body);
		font-size: 13.5px;
		color: var(--ink);
		background: transparent;
		border: none;
		border-bottom: 1px dashed var(--rule);
		outline: none;
		caret-color: var(--vermilion);
		transition: border-color 0.2s;
	}
	.mem-add::placeholder {
		font-family: var(--serif);
		font-style: italic;
		color: var(--ink-3);
	}
	.mem-add:focus {
		border-bottom-color: var(--vermilion);
	}
	.mem {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 10px 2px;
		border-bottom: 1px solid var(--rule-faint);
	}
	.mem-text {
		flex: 1;
		min-width: 0;
		text-align: left;
		font-family: var(--body);
		font-size: 13.5px;
		line-height: 1.55;
		color: var(--ink);
		background: transparent;
		cursor: text;
		overflow-wrap: anywhere;
	}
	.mem-text:hover {
		color: var(--ink-2);
	}
	.mem-edit {
		flex: 1;
		min-width: 0;
		resize: none;
		font-family: var(--body);
		font-size: 13.5px;
		line-height: 1.55;
		color: var(--ink);
		background: transparent;
		border: none;
		border-bottom: 1px dashed var(--vermilion);
		outline: none;
		caret-color: var(--vermilion);
	}
	.mem-x {
		flex: none;
		display: grid;
		place-items: center;
		min-width: 22px;
		height: 22px;
		margin-top: 1px;
		border-radius: 50%;
		color: var(--ink-3);
		background: transparent;
		transition:
			color 0.18s,
			background 0.18s;
	}
	.mem-x:hover,
	.mem-x.armed {
		color: var(--err);
		background: color-mix(in srgb, var(--err) 9%, transparent);
	}
	.mem-sure {
		font-family: var(--mono);
		font-size: 9px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 0 7px;
	}
	.mem-empty {
		margin: 0;
		padding: 14px 2px;
		font-family: var(--serif);
		font-style: italic;
		font-size: 13.5px;
		color: var(--ink-3);
	}

	/* ── the records — acts, not forms ── */
	.act {
		display: flex;
		align-items: baseline;
		gap: 10px;
		width: 100%;
		text-align: left;
		padding: 14px 2px;
		border-bottom: 1px solid var(--rule-faint);
		font-family: var(--serif);
		font-style: italic;
		font-size: 14.5px;
		color: var(--ink-2);
		background: transparent;
		transition:
			color 0.2s,
			transform 0.25s var(--spring);
	}
	.act:hover {
		color: var(--vermilion);
		transform: translateX(3px);
	}
	.act-meta {
		font-family: var(--mono);
		font-style: normal;
		font-size: 9.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--ink-3);
	}
	.act-arrow {
		margin-left: auto;
		align-self: center;
		flex: none;
		opacity: 0;
		transform: translateX(-4px);
		transition:
			opacity 0.2s,
			transform 0.25s var(--spring);
	}
	.act:hover .act-arrow {
		opacity: 1;
		transform: none;
	}
	.act.danger:hover,
	.act.armed {
		color: var(--err);
	}
	.act.armed {
		animation: armPulse 1.1s ease-in-out infinite;
	}
	@keyframes armPulse {
		50% {
			opacity: 0.62;
		}
	}

	/* ── colophon ── */
	.press-colophon {
		margin-top: 48px;
		text-align: center;
	}
	.colo-line {
		margin: 14px 0 0;
		font-family: var(--mono);
		font-size: 9.5px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--ink-3);
	}
	.colo-links {
		display: flex;
		justify-content: center;
		gap: 26px;
		margin-top: 16px;
	}
	.colo-link {
		font-family: var(--serif);
		font-style: italic;
		font-size: 13.5px;
		color: var(--ink-3);
		background: transparent;
		transition:
			color 0.2s,
			transform 0.25s var(--spring);
	}
	.colo-link:hover {
		color: var(--ink);
		transform: translateX(2px);
	}
	.colo-link.leave:hover {
		color: var(--vermilion);
	}

	/* ── small desks ── */
	@media (max-width: 640px) {
		.press-veil {
			padding: 0;
		}
		.press {
			width: 100%;
			height: 100%;
			border-radius: 0;
			border: none;
		}
		.press-row {
			flex-wrap: wrap;
		}
		.inline-input {
			text-align: left;
		}
	}
</style>
