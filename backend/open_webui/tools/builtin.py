"""
Built-in tools for Open WebUI.

These tools are automatically available when native function calling is enabled.

IMPORTANT: DO NOT IMPORT THIS MODULE DIRECTLY IN OTHER PARTS OF THE CODEBASE.
"""

import asyncio
import json
import logging
import time
from typing import Optional

from fastapi import Request

from open_webui.models.chats import Chats
from open_webui.models.config import Config
from open_webui.models.groups import Groups
from open_webui.models.memories import Memories
from open_webui.models.users import UserModel
from open_webui.retrieval.utils import get_content_from_url
from open_webui.retrieval.vector.async_client import ASYNC_VECTOR_DB_CLIENT
from open_webui.routers.images import (
    CreateImageForm,
    EditImageForm,
    image_edits,
    image_generations,
)
from open_webui.routers.memories import (
    AddMemoryForm,
    ListMemoryPathsForm,
    MemoryUpdateModel,
    ReadMemoryPathForm,
    SearchMemoriesForm,
    UpdateMemoriesForm,
    list_memory_paths as _list_memory_paths,
    read_memory_path as _read_memory_path,
    search_memories as _search_memories,
    update_memories as _update_memories,
    update_memory_by_id,
)
from open_webui.routers.memories import (
    add_memory as _add_memory,
)
from open_webui.routers.retrieval import search_web as _search_web
from open_webui.utils.sanitize import sanitize_code

log = logging.getLogger(__name__)

MAX_KNOWLEDGE_BASE_SEARCH_ITEMS = 10_000


async def _has_read_access_to_file(
    file,
    user_id: str,
    user_role: str,
    model_knowledge: Optional[list[dict]] = None,
) -> bool:
    """Check if a user can read a file via ownership, admin role, model attachment, or access grants."""
    if file.user_id == user_id or user_role == 'admin':
        return True
    if model_knowledge and any(item.get('type') == 'file' and item.get('id') == file.id for item in model_knowledge):
        return True
    from open_webui.utils.access_control.files import has_access_to_file

    return await has_access_to_file(
        file_id=file.id,
        access_type='read',
        user=UserModel(**{'id': user_id, 'role': user_role}),
    )


# =============================================================================
# TIME UTILITIES
# =============================================================================


async def get_current_timestamp(
    __request__: Request = None,
    __user__: dict = None,
) -> str:
    """
    Get the current Unix timestamp in seconds.

    :return: JSON with current_timestamp (seconds), current_iso (UTC ISO format), and user_local_iso (user's local time)
    """
    try:
        import datetime
        from zoneinfo import ZoneInfo

        now = datetime.datetime.now(datetime.timezone.utc)
        result = {
            'current_timestamp': int(now.timestamp()),
            'current_iso': now.isoformat(),
        }

        # Include the user's local time if timezone is available
        tz_name = __user__.get('timezone') if __user__ else None
        if tz_name:
            try:
                user_tz = ZoneInfo(tz_name)
                user_now = now.astimezone(user_tz)
                result['user_local_iso'] = user_now.isoformat()
                result['user_timezone'] = tz_name
            except Exception:
                pass

        return json.dumps(result, ensure_ascii=False)
    except Exception as e:
        log.exception(f'get_current_timestamp error: {e}')
        return json.dumps({'error': str(e)})


async def calculate_timestamp(
    days_ago: int = 0,
    weeks_ago: int = 0,
    months_ago: int = 0,
    years_ago: int = 0,
    __request__: Request = None,
    __user__: dict = None,
) -> str:
    """
    Get the current Unix timestamp, optionally adjusted by days, weeks, months, or years.
    Use this to calculate timestamps for date filtering in search functions.
    Examples: "last week" = weeks_ago=1, "3 days ago" = days_ago=3, "a year ago" = years_ago=1

    :param days_ago: Number of days to subtract from current time (default: 0)
    :param weeks_ago: Number of weeks to subtract from current time (default: 0)
    :param months_ago: Number of months to subtract from current time (default: 0)
    :param years_ago: Number of years to subtract from current time (default: 0)
    :return: JSON with current_timestamp and calculated_timestamp (both in seconds)
    """
    try:
        import datetime

        from dateutil.relativedelta import relativedelta

        now = datetime.datetime.now(datetime.timezone.utc)
        current_ts = int(now.timestamp())

        # Calculate the adjusted time
        total_days = days_ago + (weeks_ago * 7)
        adjusted = now - datetime.timedelta(days=total_days)

        # Handle months and years separately (variable length)
        if months_ago > 0 or years_ago > 0:
            adjusted = adjusted - relativedelta(months=months_ago, years=years_ago)

        adjusted_ts = int(adjusted.timestamp())

        result = {
            'current_timestamp': current_ts,
            'current_iso': now.isoformat(),
            'calculated_timestamp': adjusted_ts,
            'calculated_iso': adjusted.isoformat(),
        }

        # Include the user's local time if timezone is available
        tz_name = __user__.get('timezone') if __user__ else None
        if tz_name:
            try:
                from zoneinfo import ZoneInfo

                user_tz = ZoneInfo(tz_name)
                result['user_local_iso'] = now.astimezone(user_tz).isoformat()
                result['calculated_local_iso'] = adjusted.astimezone(user_tz).isoformat()
                result['user_timezone'] = tz_name
            except Exception:
                pass

        return json.dumps(result, ensure_ascii=False)
    except ImportError:
        # Fallback without dateutil
        import datetime

        now = datetime.datetime.now(datetime.timezone.utc)
        current_ts = int(now.timestamp())
        total_days = days_ago + (weeks_ago * 7) + (months_ago * 30) + (years_ago * 365)
        adjusted = now - datetime.timedelta(days=total_days)
        adjusted_ts = int(adjusted.timestamp())
        result = {
            'current_timestamp': current_ts,
            'current_iso': now.isoformat(),
            'calculated_timestamp': adjusted_ts,
            'calculated_iso': adjusted.isoformat(),
        }

        tz_name = __user__.get('timezone') if __user__ else None
        if tz_name:
            try:
                from zoneinfo import ZoneInfo

                user_tz = ZoneInfo(tz_name)
                result['user_local_iso'] = now.astimezone(user_tz).isoformat()
                result['calculated_local_iso'] = adjusted.astimezone(user_tz).isoformat()
                result['user_timezone'] = tz_name
            except Exception:
                pass

        return json.dumps(result, ensure_ascii=False)
    except Exception as e:
        log.exception(f'calculate_timestamp error: {e}')
        return json.dumps({'error': str(e)})


# =============================================================================
# WEB SEARCH TOOLS
# =============================================================================


async def search_web(
    query: str,
    count: Optional[int] = None,
    __request__: Request = None,
    __user__: dict = None,
) -> str:
    """
    Search the public web for information. Best for current events, external references,
    or topics not covered in internal documents.

    :param query: The search query to look up
    :param count: Number of results to return (default: admin-configured value)
    :return: JSON with search results containing title, link, and snippet for each result
    """
    if __request__ is None:
        return json.dumps({'error': 'Request context not available'})

    try:
        engine = await Config.get('web.search.engine')
        user = UserModel(**__user__) if __user__ else None

        configured = await Config.get('web.search.result_count')
        max_count = 5 if configured is None else configured
        count = max(1, min(count, max_count)) if count is not None else max_count

        results = await _search_web(__request__, engine, query, user)

        # Limit results
        results = results[:count] if results else []

        return json.dumps(
            [{'title': r.title, 'link': r.link, 'snippet': r.snippet} for r in results],
            ensure_ascii=False,
        )
    except Exception as e:
        log.exception(f'search_web error: {e}')
        return json.dumps({'error': str(e)})


async def fetch_url(
    url: str,
    __request__: Request = None,
    __user__: dict = None,
) -> str:
    """
    Fetch and extract the main text content from a web page URL.

    :param url: The URL to fetch content from
    :return: The extracted text content from the page
    """
    if __request__ is None:
        return json.dumps({'error': 'Request context not available'})

    try:
        content, _ = await get_content_from_url(__request__, url)

        # Truncate if configured (WEB_FETCH_MAX_CONTENT_LENGTH)
        # Guard: content may be None if the web loader silently failed
        if content is not None:
            max_length = await Config.get('web.fetch.max_content_length')
            if max_length and max_length > 0 and len(content) > max_length:
                content = content[:max_length] + '\n\n[Content truncated...]'
        else:
            content = ''

        return content
    except Exception as e:
        log.warning(f'fetch_url error: {e}')
        return json.dumps({'error': str(e)})


# =============================================================================
# IMAGE GENERATION TOOLS
# =============================================================================


async def generate_image(
    prompt: str,
    __request__: Request = None,
    __user__: dict = None,
    __event_emitter__: callable = None,
    __chat_id__: str = None,
    __message_id__: str = None,
) -> str:
    """
    Generate an image based on a text prompt.

    :param prompt: A detailed description of the image to generate
    :return: Confirmation that the image was generated, or an error message
    """
    if __request__ is None:
        return json.dumps({'error': 'Request context not available'})

    try:
        user = UserModel(**__user__) if __user__ else None

        images = await image_generations(
            request=__request__,
            form_data=CreateImageForm(prompt=prompt),
            user=user,
        )

        # Prepare file entries for the images
        image_files = [{'type': 'image', 'url': img['url']} for img in images]

        # Persist files to DB if chat context is available
        if __chat_id__ and __message_id__ and images:
            db_files = await Chats.add_message_files_by_id_and_message_id(
                __chat_id__,
                __message_id__,
                image_files,
            )
            if db_files is not None:
                image_files = db_files

        # Emit the images to the UI if event emitter is available
        if __event_emitter__ and image_files:
            await __event_emitter__(
                {
                    'type': 'chat:message:files',
                    'data': {
                        'files': image_files,
                    },
                }
            )
            # Return a message indicating the image is already displayed
            return json.dumps(
                {
                    'status': 'success',
                    'message': 'The image has been successfully generated and is already visible to the user in the chat. You do not need to display or embed the image again - just acknowledge that it has been created.',
                    'images': images,
                },
                ensure_ascii=False,
            )

        return json.dumps({'status': 'success', 'images': images}, ensure_ascii=False)
    except Exception as e:
        log.exception(f'generate_image error: {e}')
        return json.dumps({'error': str(e)})


async def edit_image(
    prompt: str,
    image_urls: list[str],
    __request__: Request = None,
    __user__: dict = None,
    __event_emitter__: callable = None,
    __chat_id__: str = None,
    __message_id__: str = None,
) -> str:
    """
    Transform one or more existing images according to a text prompt.
    Supports targeted edits such as adding, removing, replacing, inpainting, extending, or compositing image content.

    :param prompt: A description of the transformation to apply to the provided images
    :param image_urls: Source image URLs to modify or use as composition inputs
    :return: Confirmation that the images were edited, or an error message
    """
    if __request__ is None:
        return json.dumps({'error': 'Request context not available'})

    try:
        user = UserModel(**__user__) if __user__ else None

        images = await image_edits(
            request=__request__,
            form_data=EditImageForm(prompt=prompt, image=image_urls),
            user=user,
        )

        # Prepare file entries for the images
        image_files = [{'type': 'image', 'url': img['url']} for img in images]

        # Persist files to DB if chat context is available
        if __chat_id__ and __message_id__ and images:
            db_files = await Chats.add_message_files_by_id_and_message_id(
                __chat_id__,
                __message_id__,
                image_files,
            )
            if db_files is not None:
                image_files = db_files

        # Emit the images to the UI if event emitter is available
        if __event_emitter__ and image_files:
            await __event_emitter__(
                {
                    'type': 'chat:message:files',
                    'data': {
                        'files': image_files,
                    },
                }
            )
            # Return a message indicating the image is already displayed
            return json.dumps(
                {
                    'status': 'success',
                    'message': 'The edited image has been successfully generated and is already visible to the user in the chat. You do not need to display or embed the image again - just acknowledge that it has been created.',
                    'images': images,
                },
                ensure_ascii=False,
            )

        return json.dumps({'status': 'success', 'images': images}, ensure_ascii=False)
    except Exception as e:
        log.exception(f'edit_image error: {e}')
        return json.dumps({'error': str(e)})


# =============================================================================
# CODE INTERPRETER TOOLS
# =============================================================================


async def execute_code(
    code: str,
    __request__: Request = None,
    __user__: dict = None,
    __event_emitter__: callable = None,
    __event_call__: callable = None,
    __chat_id__: str = None,
    __message_id__: str = None,
    __metadata__: dict = None,
) -> str:
    """
    Execute Python code in a sandboxed environment and return the output.
    Use this to perform calculations, data analysis, generate visualizations,
    or run any Python code that would help answer the user's question.

    :param code: The Python code to execute
    :return: JSON with stdout, stderr, and result from execution
    """
    from uuid import uuid4

    if __request__ is None:
        return json.dumps({'error': 'Request context not available'})

    try:
        # Sanitize code (strips ANSI codes and markdown fences)
        code = sanitize_code(code)

        # Import blocked modules from config (same as middleware)
        from open_webui.config import CODE_INTERPRETER_BLOCKED_MODULES

        # Add import blocking code if there are blocked modules
        if CODE_INTERPRETER_BLOCKED_MODULES:
            import textwrap

            blocking_code = textwrap.dedent(
                f"""
                import builtins

                BLOCKED_MODULES = {CODE_INTERPRETER_BLOCKED_MODULES}

                _real_import = builtins.__import__
                def restricted_import(name, globals=None, locals=None, fromlist=(), level=0):
                    if name.split('.')[0] in BLOCKED_MODULES:
                        importer_name = globals.get('__name__') if globals else None
                        if importer_name == '__main__':
                            raise ImportError(
                                f"Direct import of module {{name}} is restricted."
                            )
                    return _real_import(name, globals, locals, fromlist, level)

                builtins.__import__ = restricted_import
                """
            )
            code = blocking_code + '\n' + code

        engine = await Config.get('code_interpreter.engine', 'pyodide')
        if engine == 'pyodide':
            # Execute via frontend pyodide using bidirectional event call
            if __event_call__ is None:
                return json.dumps(
                    {'error': 'Event call not available. WebSocket connection required for pyodide execution.'}
                )

            output = await __event_call__(
                {
                    'type': 'execute:python',
                    'data': {
                        'id': str(uuid4()),
                        'code': code,
                        'session_id': (__metadata__.get('session_id') if __metadata__ else None),
                        'files': (__metadata__.get('files', []) if __metadata__ else []),
                    },
                }
            )

            # Parse the output - pyodide returns dict with stdout, stderr, result
            if isinstance(output, dict):
                # Handle error responses from event_caller (e.g. session disconnected, timeout)
                if output.get('error') and not output.get('stdout') and not output.get('result'):
                    stderr = output['error']
                    stdout = ''
                    result = ''
                else:
                    stdout = output.get('stdout', '')
                    stderr = output.get('stderr', '')
                    result = output.get('result', '')
            else:
                stdout = ''
                stderr = ''
                result = str(output) if output else ''

        elif engine == 'jupyter':
            from open_webui.utils.code_interpreter import execute_code_jupyter

            jupyter_auth = await Config.get('code_interpreter.jupyter.auth')

            output = await execute_code_jupyter(
                await Config.get('code_interpreter.jupyter.url'),
                code,
                (await Config.get('code_interpreter.jupyter.auth_token') if jupyter_auth == 'token' else None),
                (await Config.get('code_interpreter.jupyter.auth_password') if jupyter_auth == 'password' else None),
                await Config.get('code_interpreter.jupyter.timeout'),
            )

            stdout = output.get('stdout', '')
            stderr = output.get('stderr', '')
            result = output.get('result', '')

        else:
            return json.dumps({'error': f'Unknown code interpreter engine: {engine}'})

        # Handle image outputs (base64 encoded) - replace with uploaded URLs
        # Get actual user object for image upload (upload_image requires user.id attribute)
        if __user__ and __user__.get('id'):
            from open_webui.models.users import Users
            from open_webui.utils.files import get_image_url_from_base64

            user = await Users.get_user_by_id(__user__['id'])

            # Extract and upload images from stdout
            if stdout and isinstance(stdout, str):
                stdout_lines = stdout.split('\n')
                for idx, line in enumerate(stdout_lines):
                    if 'data:image/png;base64' in line:
                        image_url = await get_image_url_from_base64(
                            __request__,
                            line,
                            __metadata__ or {},
                            user,
                        )
                        if image_url:
                            stdout_lines[idx] = f'![Output Image]({image_url})'
                stdout = '\n'.join(stdout_lines)

            # Extract and upload images from result
            if result and isinstance(result, str):
                result_lines = result.split('\n')
                for idx, line in enumerate(result_lines):
                    if 'data:image/png;base64' in line:
                        image_url = await get_image_url_from_base64(
                            __request__,
                            line,
                            __metadata__ or {},
                            user,
                        )
                        if image_url:
                            result_lines[idx] = f'![Output Image]({image_url})'
                result = '\n'.join(result_lines)

        response = {
            'status': 'success',
            'stdout': stdout,
            'stderr': stderr,
            'result': result,
        }

        return json.dumps(response, ensure_ascii=False)
    except Exception as e:
        log.exception(f'execute_code error: {e}')
        return json.dumps({'error': str(e)})


# =============================================================================
# MEMORY TOOLS
# =============================================================================


async def list_memory_paths(
    query: str = '',
    count: int = 100,
    type: str = 'all',
    __request__: Request = None,
    __user__: dict = None,
) -> str:
    """
    List saved memory paths to find existing memory groups before writing or moving memories.

    :param query: Optional query to filter memory paths or contents
    :param count: Maximum number of paths to return
    :param type: "user", "context", or "all"
    :return: JSON with memory paths, counts, children, and update times
    """
    try:
        user = UserModel(**__user__) if __user__ else None
        result = await _list_memory_paths(
            ListMemoryPathsForm(
                query=query or None,
                type=type if type in {'user', 'context', 'all'} else 'all',
                limit=count,
            ),
            user,
        )
        return json.dumps(result, ensure_ascii=False)
    except Exception as e:
        log.exception(f'list_memory_paths error: {e}')
        return json.dumps({'error': str(e)})


async def read_memory_path(
    path: str,
    count: int = 50,
    type: str = 'all',
    include_children: bool = True,
    __request__: Request = None,
    __user__: dict = None,
) -> str:
    """
    Read saved memories at a memory path, including nearby parent and child paths.

    :param path: Memory path to read
    :param count: Maximum number of memories to return
    :param type: "user", "context", or "all"
    :param include_children: Include memories under child paths
    :return: JSON with parent paths, child paths, and memories at the path
    """
    try:
        user = UserModel(**__user__) if __user__ else None
        result = await _read_memory_path(
            ReadMemoryPathForm(
                path=path,
                type=type if type in {'user', 'context', 'all'} else 'all',
                include_children=include_children,
                limit=count,
            ),
            user,
        )
        return json.dumps(result, ensure_ascii=False)
    except Exception as e:
        log.exception(f'read_memory_path error: {e}')
        return json.dumps({'error': str(e)})


async def search_memories(
    query: str = '',
    count: int = 5,
    type: str = 'all',
    path: Optional[str] = None,
    memory_id: Optional[str] = None,
    __request__: Request = None,
    __user__: dict = None,
) -> str:
    """
    Search or browse saved memories by content, path, type, or memory ID.

    :param query: Optional query to search memory content and path
    :param count: Number of memories to return (default 5)
    :param type: "user", "context", or "all"
    :param path: Optional memory path to search around
    :param memory_id: Optional exact memory ID to read
    :return: JSON with matching memories and their dates
    """
    if __request__ is None:
        return json.dumps({'error': 'Request context not available'})

    try:
        user = UserModel(**__user__) if __user__ else None

        memories = await _search_memories(
            SearchMemoriesForm(
                query=query or None,
                type=type if type in {'user', 'context', 'all'} else 'all',
                path=path,
                memory_id=memory_id,
                limit=count,
            ),
            user,
        )

        if not memories:
            return json.dumps([])

        return json.dumps(
            [
                {
                    'id': memory.id,
                    'type': memory.type,
                    'path': memory.path,
                    'content': memory.content,
                    'created_at': time.strftime('%Y-%m-%d', time.localtime(memory.created_at)),
                    'updated_at': time.strftime('%Y-%m-%d', time.localtime(memory.updated_at)),
                }
                for memory in memories
            ],
            ensure_ascii=False,
        )
    except Exception as e:
        log.exception(f'search_memories error: {e}')
        return json.dumps({'error': str(e)})


async def add_memory(
    content: str,
    type: str = 'user',
    path: Optional[str] = None,
    __request__: Request = None,
    __user__: dict = None,
) -> str:
    """
    Save enduring information that can improve future chats.

    Save stable preferences, goals, projects, relationships, habits, and standing instructions.
    Do not save one-off activity, meals, routine daily events, temporary mood, or other short-lived details
    unless the user explicitly asks you to remember them.

    :param content: The memory content to store
    :param type: Use "user" for facts/preferences about the user, or "context" for other durable context
    :param path: Optional stable memory address for grouping related memories
    :return: Confirmation that the memory was stored
    """
    if __request__ is None:
        return json.dumps({'error': 'Request context not available'})

    try:
        user = UserModel(**__user__) if __user__ else None

        memory = await _add_memory(
            __request__,
            AddMemoryForm(content=content, type=Memories.normalize_memory_type(type), path=path),
            user,
        )

        return json.dumps(
            {'status': 'success', 'id': memory.id, 'type': memory.type, 'path': memory.path},
            ensure_ascii=False,
        )
    except Exception as e:
        log.exception(f'add_memory error: {e}')
        return json.dumps({'error': str(e)})


async def update_memory(
    operations: list[dict],
    __request__: Request = None,
    __user__: dict = None,
) -> str:
    """
    Apply a batch of memory changes after learning enduring information.

    Use type "user" for facts, preferences, or instructions about the user.
    Use type "context" for other durable context that may help future chats.
    Do not save one-off activity, meals, routine daily events, temporary mood, or other short-lived details
    unless the user explicitly asks you to remember them.
    Path is optional. Use it as a stable memory address to group related memories.
    Prefer an existing path from list_memory_paths when one fits.
    Leave path empty when no useful grouping is clear.

    Operation shapes:
    - {"action": "add", "content": "...", "type": "user"|"context", "path": "..."}
    - {"action": "replace", "id": "...", "content": "...", "type": "user"|"context", "path": "..."}
    - {"action": "move", "id": "...", "path": "..."}
    - {"action": "remove", "id": "..."}

    :param operations: Memory operations to apply in one request
    :return: JSON with operation results
    """
    if __request__ is None:
        return json.dumps({'error': 'Request context not available'})

    try:
        user = UserModel(**__user__) if __user__ else None
        operation_results = await _update_memories(
            __request__,
            UpdateMemoriesForm(operations=operations),
            user,
        )
        return json.dumps(operation_results, ensure_ascii=False)
    except Exception as e:
        log.exception(f'update_memory error: {e}')
        return json.dumps({'error': str(e)})


async def replace_memory_content(
    memory_id: str,
    content: str,
    type: Optional[str] = None,
    path: Optional[str] = None,
    __request__: Request = None,
    __user__: dict = None,
) -> str:
    """
    Update an existing saved memory by its ID when its content needs correction.

    :param memory_id: The ID of the memory to update
    :param content: The new content for the memory
    :param type: Optional "user" or "context" type for the updated memory
    :param path: Optional stable memory address for grouping related memories
    :return: Confirmation that the memory was updated
    """
    if __request__ is None:
        return json.dumps({'error': 'Request context not available'})

    try:
        user = UserModel(**__user__) if __user__ else None

        memory = await update_memory_by_id(
            memory_id=memory_id,
            request=__request__,
            form_data=MemoryUpdateModel(
                content=content,
                type=Memories.normalize_memory_type(type) if type else None,
                path=path,
            ),
            user=user,
        )

        return json.dumps(
            {
                'status': 'success',
                'id': memory.id,
                'type': memory.type,
                'path': memory.path,
                'content': memory.content,
            },
            ensure_ascii=False,
        )
    except Exception as e:
        log.exception(f'replace_memory_content error: {e}')
        return json.dumps({'error': str(e)})


async def delete_memory(
    memory_id: str,
    __request__: Request = None,
    __user__: dict = None,
) -> str:
    """
    Delete a saved memory by its ID.

    :param memory_id: The ID of the memory to delete
    :return: Confirmation that the memory was deleted
    """
    if __request__ is None:
        return json.dumps({'error': 'Request context not available'})

    try:
        user = UserModel(**__user__) if __user__ else None

        result = await Memories.delete_memory_by_id_and_user_id(memory_id, user.id)

        if result:
            await ASYNC_VECTOR_DB_CLIENT.delete(collection_name=f'user-memory-{user.id}', ids=[memory_id])
            return json.dumps(
                {'status': 'success', 'message': f'Memory {memory_id} deleted'},
                ensure_ascii=False,
            )
        else:
            return json.dumps({'error': 'Memory not found or access denied'})
    except Exception as e:
        log.exception(f'delete_memory error: {e}')
        return json.dumps({'error': str(e)})


async def list_memories(
    __request__: Request = None,
    __user__: dict = None,
) -> str:
    """
    List all stored memories for the user, including IDs and timestamps.

    :return: JSON list of all memories with id, content, and dates
    """
    if __request__ is None:
        return json.dumps({'error': 'Request context not available'})

    try:
        user = UserModel(**__user__) if __user__ else None

        memories = await Memories.get_memories_by_user_id(user.id)

        if memories:
            memory_rows = [
                {
                    'id': m.id,
                    'type': m.type,
                    'path': m.path,
                    'content': m.content,
                    'created_at': time.strftime('%Y-%m-%d %H:%M', time.localtime(m.created_at)),
                    'updated_at': time.strftime('%Y-%m-%d %H:%M', time.localtime(m.updated_at)),
                }
                for m in memories
            ]
            return json.dumps(memory_rows, ensure_ascii=False)
        else:
            return json.dumps([])
    except Exception as e:
        log.exception(f'list_memories error: {e}')
        return json.dumps({'error': str(e)})


# =============================================================================
# CHATS TOOLS
# =============================================================================


async def search_chats(
    query: str,
    count: int = 5,
    start_timestamp: Optional[int] = None,
    end_timestamp: Optional[int] = None,
    __request__: Request = None,
    __user__: dict = None,
    __chat_id__: str = None,
) -> str:
    """
    Search the user's previous chat conversations by title and message content.
    Helpful for finding details from earlier conversations.

    :param query: The search query to find matching chats
    :param count: Maximum number of results to return (default: 5)
    :param start_timestamp: Only include chats updated after this Unix timestamp (seconds)
    :param end_timestamp: Only include chats updated before this Unix timestamp (seconds)
    :return: JSON with matching chats containing id, title, updated_at, and content snippet
    """
    if __request__ is None:
        return json.dumps({'error': 'Request context not available'})

    if not __user__:
        return json.dumps({'error': 'User context not available'})

    try:
        user_id = __user__.get('id')

        chats = await Chats.get_chats_by_user_id_and_search_text(
            user_id=user_id,
            search_text=query,
            include_archived=False,
            skip=0,
            limit=count * 3,  # Fetch more for filtering
        )

        results = []
        for chat in chats:
            # Skip the current chat to avoid showing it in search results
            if __chat_id__ and chat.id == __chat_id__:
                continue

            # Apply date filters (updated_at is in seconds)
            if start_timestamp and chat.updated_at < start_timestamp:
                continue
            if end_timestamp and chat.updated_at > end_timestamp:
                continue

            # Find a matching message snippet
            snippet = ''
            messages = (getattr(chat, 'chat', None) or {}).get('history', {}).get('messages', {})
            lower_query = query.lower()

            for msg_id, msg in messages.items():
                content = msg.get('content', '')
                if isinstance(content, str) and lower_query in content.lower():
                    idx = content.lower().find(lower_query)
                    start = max(0, idx - 50)
                    end = min(len(content), idx + len(query) + 100)
                    snippet = ('...' if start > 0 else '') + content[start:end] + ('...' if end < len(content) else '')
                    break

            if not snippet and lower_query in chat.title.lower():
                snippet = f'Title match: {chat.title}'

            results.append(
                {
                    'id': chat.id,
                    'title': chat.title,
                    'snippet': snippet,
                    'updated_at': chat.updated_at,
                }
            )

            if len(results) >= count:
                break

        return json.dumps(results, ensure_ascii=False)
    except Exception as e:
        log.exception(f'search_chats error: {e}')
        return json.dumps({'error': str(e)})


async def view_chat(
    chat_id: str,
    __request__: Request = None,
    __user__: dict = None,
) -> str:
    """
    Get the full conversation history of a chat by its ID after a relevant
    previous chat has been identified.

    :param chat_id: The ID of the chat to retrieve
    :return: JSON with the chat's id, title, and messages
    """
    if __request__ is None:
        return json.dumps({'error': 'Request context not available'})

    if not __user__:
        return json.dumps({'error': 'User context not available'})

    try:
        user_id = __user__.get('id')

        chat = await Chats.get_chat_by_id_and_user_id(chat_id, user_id)

        if not chat:
            return json.dumps({'error': 'Chat not found or access denied'})

        # Extract messages from history
        messages = []
        history = chat.chat.get('history', {})
        msg_dict = history.get('messages', {})

        # Build message chain from currentId
        current_id = history.get('currentId')
        visited = set()

        while current_id and current_id not in visited:
            visited.add(current_id)
            msg = msg_dict.get(current_id)
            if msg:
                messages.append(
                    {
                        'role': msg.get('role', ''),
                        'content': msg.get('content', ''),
                    }
                )
            current_id = msg.get('parentId') if msg else None

        # Reverse to get chronological order
        messages.reverse()

        return json.dumps(
            {
                'id': chat.id,
                'title': chat.title,
                'messages': messages,
                'updated_at': chat.updated_at,
                'created_at': chat.created_at,
            },
            ensure_ascii=False,
        )
    except Exception as e:
        log.exception(f'view_chat error: {e}')
        return json.dumps({'error': str(e)})


# =============================================================================
# TASK MANAGEMENT TOOLS
# =============================================================================

from typing import Literal

from pydantic import BaseModel, Field

VALID_TASK_STATUSES = {'pending', 'in_progress', 'completed', 'cancelled'}


class TaskItem(BaseModel):
    id: Optional[str] = Field(None, description='Unique identifier for the task. Auto-generated if omitted.')
    content: str = Field(..., description='Task description.')
    status: Literal['pending', 'in_progress', 'completed', 'cancelled'] = Field('pending', description='Task status.')


def _task_summary(all_tasks: list[dict]) -> dict:
    """Build summary counts for a task list."""
    pending = sum(1 for t in all_tasks if t['status'] == 'pending')
    in_progress = sum(1 for t in all_tasks if t['status'] == 'in_progress')
    completed = sum(1 for t in all_tasks if t['status'] == 'completed')
    cancelled = sum(1 for t in all_tasks if t['status'] == 'cancelled')
    return {
        'total': len(all_tasks),
        'pending': pending,
        'in_progress': in_progress,
        'completed': completed,
        'cancelled': cancelled,
    }


async def _emit_tasks(event_emitter, all_tasks: list[dict]):
    """Persist task state to the UI."""
    if event_emitter:
        await event_emitter(
            {
                'type': 'chat:message:tasks',
                'data': {
                    'tasks': all_tasks,
                },
            }
        )


async def create_tasks(
    tasks: list[TaskItem],
    __chat_id__: str = None,
    __message_id__: str = None,
    __event_emitter__: callable = None,
    __request__: Request = None,
    __user__: dict = None,
) -> str:
    """
    Create a visible task checklist for multi-step work so progress can be shown in chat.

    :param tasks: List of task items. Each item: content (string, required), status (pending|in_progress|completed|cancelled, default pending), id (optional, auto-generated).
    :return: JSON with the full task list and summary counts
    """
    if __chat_id__ is None:
        return json.dumps({'error': 'Chat context not available'})

    try:
        all_tasks = []
        for idx, task in enumerate(tasks):
            if hasattr(task, 'model_dump'):
                d = task.model_dump(exclude_none=True)
            elif isinstance(task, dict):
                d = task
            else:
                d = dict(task)

            content = str(d.get('content', '')).strip()
            if not content:
                continue

            item_id = str(d.get('id', '') or '').strip() or str(idx + 1)
            status = str(d.get('status', 'pending')).strip().lower()
            if status not in VALID_TASK_STATUSES:
                status = 'pending'

            all_tasks.append({'id': item_id, 'content': content, 'status': status})

        await Chats.update_chat_tasks_by_id(__chat_id__, all_tasks)
        await _emit_tasks(__event_emitter__, all_tasks)

        return json.dumps(
            {'tasks': all_tasks, 'summary': _task_summary(all_tasks)},
            ensure_ascii=False,
        )
    except Exception as e:
        log.exception(f'tasks error: {e}')
        return json.dumps({'error': str(e)})


async def update_task(
    id: str,
    status: str = 'completed',
    __chat_id__: str = None,
    __message_id__: str = None,
    __event_emitter__: callable = None,
    __request__: Request = None,
    __user__: dict = None,
) -> str:
    """
    Mark a single visible task item as completed, in_progress, pending, or cancelled.

    :param id: The task ID to update
    :param status: New status: completed, in_progress, pending, or cancelled (default: completed)
    :return: JSON with the updated task list and summary counts
    """
    if __chat_id__ is None:
        return json.dumps({'error': 'Chat context not available'})

    try:
        status = status.strip().lower()
        if status not in VALID_TASK_STATUSES:
            return json.dumps(
                {'error': f'Invalid status: {status}. Must be one of: {", ".join(sorted(VALID_TASK_STATUSES))}'}
            )

        all_tasks = await Chats.get_chat_tasks_by_id(__chat_id__)

        found = False
        for task in all_tasks:
            if task['id'] == id:
                task['status'] = status
                found = True
                break

        if not found:
            return json.dumps({'error': f'Task with id "{id}" not found'})

        await Chats.update_chat_tasks_by_id(__chat_id__, all_tasks)
        await _emit_tasks(__event_emitter__, all_tasks)

        return json.dumps(
            {'tasks': all_tasks, 'summary': _task_summary(all_tasks)},
            ensure_ascii=False,
        )
    except Exception as e:
        log.exception(f'update_task_status error: {e}')
        return json.dumps({'error': str(e)})
