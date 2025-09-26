const clientService = require("../services/client/clientService");
const clientRepo = require("../repositories/client/clientRepository__");
const utils = require("../utils/constants");

jest.mock("../repositories/client/clientRepository", () => ({
  getClient: jest.fn(),
  setClient: jest.fn(),
}));

describe("disconnectClient", () => {
  const mockId = "123e4567";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("desconecta um cliente conectado com sucesso", async () => {
    const destroyMock = jest.fn().mockResolvedValue();

    clientRepo.getClient.mockReturnValue({
      client: { destroy: destroyMock },
      status: utils.STATE_CONNECTED,
    });

    const result = await clientService.disconnectClient(mockId);

    expect(destroyMock).toHaveBeenCalled();
    expect(clientRepo.setClient).toHaveBeenCalledWith(mockId, {
      status: utils.STATE_DISCONNECTED,
    });
    expect(result).toBe(true);
  });

  it("falha se cliente não existir", async () => {
    clientRepo.getClient.mockReturnValue(null);

    await expect(clientService.disconnectClient(mockId)).rejects.toThrow(
      "NOT_FOUND"
    );

    expect(clientRepo.setClient).not.toHaveBeenCalled();
  });

  it("captura erro do método destroy", async () => {
    const destroyMock = jest.fn().mockRejectedValue(new Error("destroy fail"));

    clientRepo.getClient.mockReturnValue({
      client: { destroy: destroyMock },
      status: utils.STATE_CONNECTED,
    });

    await expect(clientService.disconnectClient(mockId)).rejects.toThrow(
      "destroy fail"
    );

    expect(clientRepo.setClient).not.toHaveBeenCalled();
  });
});
