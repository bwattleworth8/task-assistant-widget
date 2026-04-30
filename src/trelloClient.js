const TRELLO_API_BASE = "https://api.trello.com/1";

class TrelloClient {
  constructor(credentials) {
    this.apiKey = credentials?.apiKey || "";
    this.token = credentials?.token || "";
  }

  hasCredentials() {
    return Boolean(this.apiKey && this.token);
  }

  async request(pathname, options = {}) {
    if (!this.hasCredentials()) {
      throw new Error("Trello credentials have not been configured.");
    }

    const url = new URL(`${TRELLO_API_BASE}${pathname}`);
    url.searchParams.set("key", this.apiKey);
    url.searchParams.set("token", this.token);

    for (const [key, value] of Object.entries(options.query || {})) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url, {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(formatTrelloError(response.status, detail || response.statusText));
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async getBoards() {
    const boards = await this.request("/members/me/boards", {
      query: {
        filter: "open",
        fields: "id,name,url"
      }
    });

    return boards
      .map((board) => ({
        id: board.id,
        name: board.name,
        url: board.url
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getBoardCards(boardId) {
    if (!boardId) {
      throw new Error("Choose a Trello board before loading tasks.");
    }

    const cards = await this.request(`/boards/${boardId}/cards`, {
      query: {
        filter: "open",
        fields: "id,name,desc,due,dueComplete,dateLastActivity,url,idList,labels,isTemplate,cover",
        customFieldItems: "true",
        members: "false"
      }
    });

    const [lists, customFields] = await Promise.all([
      this.request(`/boards/${boardId}/lists`, {
        query: {
          filter: "open",
          fields: "id,name"
        }
      }),
      this.getBoardCustomFields(boardId)
    ]);

    const timeSpentField = findTimeSpentField(customFields);
    const listNames = new Map(lists.map((list) => [list.id, list.name]));

    return cards
      .filter((card) => !isCompletedCard(card, listNames.get(card.idList)))
      .map((card) =>
        normalizeCard(card, listNames.get(card.idList) || "Unknown list", timeSpentField)
      )
      .sort(compareCards);
  }

  async getBoardCustomFields(boardId) {
    if (!boardId) {
      throw new Error("Choose a Trello board before loading custom fields.");
    }

    return this.request(`/boards/${boardId}/customFields`, {
      query: {
        fields: "id,name,type"
      }
    });
  }

  async addTimeSpent(boardId, cardId, minutes) {
    if (!boardId) {
      throw new Error("Choose a Trello board before tracking time.");
    }

    if (!cardId) {
      throw new Error("Missing Trello card id.");
    }

    const minutesToAdd = Number(minutes);
    if (!Number.isFinite(minutesToAdd) || minutesToAdd <= 0) {
      throw new Error("Track at least one minute before saving time.");
    }

    const customFields = await this.getBoardCustomFields(boardId);
    const timeSpentField = findTimeSpentField(customFields);

    if (!timeSpentField) {
      throw new Error('Create a Trello number custom field named "Time Spent (mins)" on this board before tracking time.');
    }

    if (timeSpentField.type !== "number") {
      throw new Error('The Trello custom field "Time Spent (mins)" must be a number field.');
    }

    const card = await this.request(`/cards/${cardId}`, {
      query: {
        fields: "id,name",
        customFieldItems: "true"
      }
    });

    const currentMinutes = getCardTimeSpent(card, timeSpentField) || 0;
    const totalMinutes = currentMinutes + minutesToAdd;

    await this.request(`/card/${cardId}/customField/${timeSpentField.id}/item`, {
      method: "PUT",
      body: {
        value: {
          number: String(totalMinutes)
        }
      }
    });

    return {
      cardId,
      minutesAdded: minutesToAdd,
      totalMinutes
    };
  }

  async completeCard(cardId) {
    if (!cardId) {
      throw new Error("Missing Trello card id.");
    }

    return this.request(`/cards/${cardId}`, {
      method: "PUT",
      query: {
        dueComplete: "true"
      }
    });
  }

  async addCardComment(cardId, text) {
    if (!cardId) {
      throw new Error("Missing Trello card id.");
    }

    const commentText = String(text || "").trim();
    if (!commentText) {
      throw new Error("Write a note before saving it to Trello.");
    }

    return this.request(`/cards/${cardId}/actions/comments`, {
      method: "POST",
      query: {
        text: commentText
      }
    });
  }
}

function normalizeCard(card, listName, timeSpentField) {
  return {
    id: card.id,
    name: card.name,
    description: card.desc || "",
    due: card.due,
    dueComplete: Boolean(card.dueComplete),
    lastActivity: card.dateLastActivity,
    url: card.url,
    listId: card.idList,
    listName,
    labels: (card.labels || []).map((label) => ({
      id: label.id,
      name: label.name || label.color || "Label",
      color: label.color || "gray"
    })),
    timeSpentMins: getCardTimeSpent(card, timeSpentField),
    status: getDueStatus(card.due)
  };
}

function findTimeSpentField(customFields) {
  return (customFields || []).find((field) => normalizeFieldName(field.name) === "time spent (mins)");
}

function isCompletedCard(card, listName) {
  return Boolean(card.dueComplete) || isCompletedListName(listName) || isTemplateCard(card);
}

function isCompletedListName(listName) {
  const normalizedListName = normalizeFieldName(listName).replace(/[^a-z0-9]+/g, " ").trim();
  return ["complete", "completed", "done"].includes(normalizedListName);
}

function isTemplateCard(card) {
  return Boolean(card.isTemplate) || Boolean(card.cover?.isTemplate);
}

function getCardTimeSpent(card, timeSpentField) {
  if (!timeSpentField) {
    return null;
  }

  const item = (card.customFieldItems || []).find(
    (customFieldItem) => customFieldItem.idCustomField === timeSpentField.id
  );

  const value = Number(item?.value?.number || 0);
  return Number.isFinite(value) ? value : 0;
}

function normalizeFieldName(name) {
  return String(name || "").trim().toLowerCase();
}

function getDueStatus(due) {
  if (!due) {
    return "none";
  }

  const now = new Date();
  const dueDate = new Date(due);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);

  if (dueDate < now) {
    return "overdue";
  }

  if (dueDate < tomorrowStart) {
    return "today";
  }

  return "upcoming";
}

function compareCards(a, b) {
  const rank = {
    overdue: 0,
    today: 1,
    upcoming: 2,
    none: 3
  };

  const rankDifference = rank[a.status] - rank[b.status];
  if (rankDifference !== 0) {
    return rankDifference;
  }

  if (a.due && b.due) {
    return new Date(a.due).getTime() - new Date(b.due).getTime();
  }

  if (a.due) {
    return -1;
  }

  if (b.due) {
    return 1;
  }

  return new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime();
}

function formatTrelloError(status, detail) {
  const normalizedDetail = String(detail || "").trim();
  const lowerDetail = normalizedDetail.toLowerCase();

  if (status === 401 && lowerDetail.includes("invalid key")) {
    return "Trello rejected the API key. Copy the generated API Key from Power-Up Admin, not the API Secret, then generate a token from that same API key.";
  }

  if (status === 401 && lowerDetail.includes("invalid token")) {
    return "Trello rejected the token. Generate a fresh token from the Token link beside the same API key you entered.";
  }

  if (status === 401) {
    return `Trello rejected the credentials (${normalizedDetail || "unauthorized"}). Check that you are using a matching API key and token.`;
  }

  return `Trello request failed (${status}): ${normalizedDetail}`;
}

module.exports = {
  TrelloClient,
  compareCards,
  getDueStatus
};
